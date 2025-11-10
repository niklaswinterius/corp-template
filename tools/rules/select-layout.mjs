import fs from "fs";

const reqPath = process.argv[2] || "content/source.request.json";
const mapPath = process.argv[3] || "layouts/template_map.json";
const tokPath = process.argv[4] || "tokens/brand.tokens.json";
const outPath = process.argv[5] || "content/final.content.json";
const rulesPath = process.argv[6] || "rules/rules.json";

const req = JSON.parse(fs.readFileSync(reqPath, "utf-8"));
const map = JSON.parse(fs.readFileSync(mapPath, "utf-8"));
const tokens = JSON.parse(fs.readFileSync(tokPath, "utf-8"));
const rules = JSON.parse(fs.readFileSync(rulesPath, "utf-8"));

const zoneNames = rules.zoneNames || ["content","left","right","notes"];

const areaOf = (ph) => (ph.w || 0) * (ph.h || 0);
const isFooter = (ph) => ["dt","sldNum","ftr"].includes(ph.type);

function layoutFeatures(L) {
  const contentPh = (L.placeholders || []).filter(p => !isFooter(p));
  const title = contentPh.find(p => ["title","ctrTitle"].includes(p.type));
  const sub = contentPh.find(p => p.type === "subTitle");
  const bodies = contentPh.filter(p => !["title","ctrTitle","subTitle"].includes(p.type));
  const totalArea = bodies.reduce((s,p)=>s+areaOf(p),0);
  return { title, sub, bodies, totalArea, count: bodies.length };
}

function scoreLayout(L, blocks) {
  const { bodies, totalArea, count } = layoutFeatures(L);
  let s = 0;

  const hasImage = blocks.some(b => b.type === "image");
  const hasTable = blocks.some(b => b.type === "table");
  const hasChart = blocks.some(b => b.type === "chart");
  const textBlock = blocks.find(b => b.type === "richtext");
  const bullets = textBlock?.bullets?.length || 0;

  if (count === 1) s += rules.weights.singleContentBonus || 0;
  if (count >= 2) s += rules.weights.twoColumnBonus || 0;
  s += (rules.weights.largeAreaBonus || 0) * totalArea;

  if (hasImage && textBlock && count >= 2) s += rules.weights.imageTextComboBonus || 0;
  if (hasTable && count === 1) s += rules.weights.tablePrefSingle || 0;
  if (hasChart && textBlock && count >= 2) s += rules.weights.chartWithTextTwoCol || 0;
  if (!hasImage && !hasTable && !hasChart && bullets >= (rules.thresholds.textHeavyBullets || 6) && count === 1) {
    s += rules.weights.textHeavySingle || 0;
  }
  return s;
}

function chooseLayout(blocks) {
  let best = null, bestScore = -Infinity;
  for (const L of map.layouts) {
    const f = layoutFeatures(L);
    if (!f.title) continue; // wir wollen immer einen Titel
    if (f.bodies.length === 0) continue;

    const sc = scoreLayout(L, blocks);
    if (sc > bestScore) { bestScore = sc; best = { L, f, score: sc }; }
  }
  return best?.L;
}

function mapBlocksToZones(L, blocks) {
  const f = layoutFeatures(L);
  const bodies = f.bodies
    .slice()
    .sort((a,b) => a.x - b.x); // links->rechts

  const zones = {};
  // einfache Heuristik: 1 body => "content"; 2 bodies => "left","right"
  if (bodies.length === 1) {
    zones.content = pickPrimaryBlock(blocks);
  } else {
    const [left, right] = bodies;
    const split = splitBlocks(blocks);
    if (split.left) zones.left = split.left;
    if (split.right) zones.right = split.right;
    // Fallback: wenn nur ein Block existiert
    if (!zones.left && pickPrimaryBlock(blocks)) zones.left = pickPrimaryBlock(blocks);
  }
  return zones;
}

function pickPrimaryBlock(blocks) {
  // Priorität: table > chart > image > richtext
  const order = { table:1, chart:2, image:3, richtext:4 };
  const sorted = blocks.slice().sort((a,b)=> (order[a.type]||9) - (order[b.type]||9));
  return sorted[0] || null;
}

function splitBlocks(blocks) {
  // typische Kombis: (chart + text) oder (image + text)
  const leftPref = pickPrimaryBlock(blocks);
  const rightPref = blocks.find(b => b.type === "richtext" && b !== leftPref) || blocks.find(b => b !== leftPref);
  return { left: leftPref || null, right: rightPref || null };
}

const out = { slides: [] };

for (const s of req.slides) {
  const L = chooseLayout(s.blocks || []);
  if (!L) throw new Error("Kein passendes Layout gefunden.");

  const zones = mapBlocksToZones(L, s.blocks || []);
  out.slides.push({
    layout: L.id,
    title: s.title,
    subtitle: s.subtitle,
    ...zones,
    meta: s.meta || {}
  });
}

fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf-8");
console.log(`OK: wrote ${outPath} (${out.slides.length} slides)`);
