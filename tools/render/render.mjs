// tools/render/render.mjs
import fs from "fs";
import path from "path";
import PptxGenJS from "pptxgenjs";

// ---------- CLI ----------
const tokPath = process.argv[2] || "tokens/brand.tokens.json";
const mapPath = process.argv[3] || "layouts/template_map.json";
const inPath  = process.argv[4] || "content/final.content.json";
const outPath = process.argv[5] || "dist/output.pptx";

// ---------- Load JSON ----------
const tokens  = JSON.parse(fs.readFileSync(tokPath, "utf-8"));
const tmap    = JSON.parse(fs.readFileSync(mapPath, "utf-8"));
const content = JSON.parse(fs.readFileSync(inPath, "utf-8"));

// ---------- Helpers ----------
const PX_PER_INCH = 96;
const px = (v) => (Number(v || 0) / PX_PER_INCH);
const get = (obj, pathStr) => pathStr.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
const isRef = (v) => typeof v === "string" && /^\{.+\}$/.test(v);
const derefOnce = (v) => (isRef(v) ? get(tokens, v.slice(1, -1)) : v);
const tokenVal = (pathStr, fallback) => {
  let v = get(tokens, pathStr);
  v = derefOnce(v?.value ?? v);
  v = derefOnce(v);
  return v ?? fallback;
};
const ensureDir = (p) => fs.mkdirSync(path.dirname(p), { recursive: true });

const color = {
  surface:   tokenVal("semantic.color.surface", "#FFFFFF"),
  onSurface: tokenVal("semantic.color.onSurface", "#000000"),
  primary:   tokenVal("semantic.color.primary", "#000000"),
  onPrimary: tokenVal("semantic.color.onPrimary", "#FFFFFF"),
  muted:     tokenVal("semantic.color.muted", tokenVal("semantic.color.onSurface", "#000000"))
};

const styleOf = (hint) => {
  const key = hint === "heading" ? "heading" : hint === "subheading" ? "subheading" : "body";
  const base = get(tokens, `semantic.typography.${key}`) || get(tokens, "semantic.typography.body") || {};
  const faceRaw = derefOnce(base?.fontFamily?.value || "Arial");
  const fontFace = String(faceRaw).split(",")[0].replace(/['"]/g, "").trim();
  const fontSize = Number(derefOnce(base?.fontSize?.value || 14));
  const lineH    = Number(derefOnce(base?.lineHeight?.value || 1.2));
  return { fontFace, fontSize, lineH };
};

const findLayout = (id) => (tmap.layouts || []).find((l) => l.id === id);
const findByType = (L, type) => (L.placeholders || []).find((p) => p.type === type);
const getBodies  = (L) => (L.placeholders || []).filter((p) => !["title","ctrTitle","subTitle"].includes(p.type));

// ---- Bildauflösung & Platzhalter ----
function resolveImagePath(urlPath) {
  if (!urlPath) return null;
  // absolute Pfade durchlassen
  if (path.isAbsolute(urlPath) && fs.existsSync(urlPath)) return urlPath;

  // Kandidaten relativ zum Projekt
  const candidates = [
    urlPath,
    path.join("images", path.basename(urlPath)),
    path.join("assets", path.basename(urlPath))
  ].map((p) => path.resolve(process.cwd(), p));

  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

function addImagePlaceholder(slide, ph, label = "[Bild fehlt]") {
  const sty = styleOf("body");
  slide.addText(label, {
    x: px(ph.x), y: px(ph.y), w: px(ph.w), h: px(ph.h),
    fontFace: sty.fontFace,
    fontSize: sty.fontSize,
    color: color.onSurface,
    align: "center",
    valign: "middle",
    fill: { color: "DDDDDD" },
    line: { color: "999999" }
  });
}

// ---------- PPTX ----------
const deck = new PptxGenJS();
const widthIn  = px(tmap.canvas?.w || 1280);
const heightIn = px(tmap.canvas?.h || 720);
deck.defineLayout({ name: "tmplLayout", width: widthIn, height: heightIn });
deck.layout = "tmplLayout";
deck.author  = "Automation";
deck.company = String(get(tokens, "meta.brand.value") || "Company");

let slideNo = 0;

// ---------- Draw helpers ----------
function addTextBox(slide, ph, text, styHint = "body", colorHex = color.onSurface) {
  const sty = styleOf(styHint);
  slide.addText(text ?? "", {
    x: px(ph.x), y: px(ph.y), w: px(ph.w), h: px(ph.h),
    fontFace: sty.fontFace,
    fontSize: sty.fontSize,
    color: colorHex,
    align: "left",
    bold: styHint === "heading",
    fill: { color: "FFFFFF", transparency: 100 }
  });
}

function addBullets(slide, ph, bullets, styHint = "body") {
  const sty = styleOf(styHint);
  const paras = (bullets || []).map((line) => ({ text: String(line), options: { bullet: true } }));
  slide.addText(paras, {
    x: px(ph.x), y: px(ph.y), w: px(ph.w), h: px(ph.h),
    fontFace: sty.fontFace,
    fontSize: sty.fontSize,
    color: color.onSurface
  });
}

function addImageBox(slide, ph, url, alt) {
  const resolved = resolveImagePath(url);
  if (!resolved) {
    console.warn(`⚠️  Bild fehlt: ${url}`);
    addImagePlaceholder(slide, ph, alt || "[Bild fehlt]");
    return;
  }
  slide.addImage({ path: resolved, x: px(ph.x), y: px(ph.y), w: px(ph.w), h: px(ph.h) });
}

function addTable(slide, ph, rows) {
  const r = Array.isArray(rows) && rows.length ? rows : [["A","B"],["1","2"]];
  slide.addTable(r, {
    x: px(ph.x), y: px(ph.y), w: px(ph.w), h: px(ph.h),
    fontFace: styleOf("body").fontFace,
    fontSize: styleOf("body").fontSize
  });
}

function addChart(slide, ph, block) {
  const key = String(block.chartType || "bar").toLowerCase();
  const chartType = (deck.ChartType && deck.ChartType[key]) || deck.ChartType.bar;
  const data = (block.series || []).map((s) => ({
    name: s.name || "",
    labels: block.categories || [],
    values: s.data || s.values || []
  }));
  const safeData = data.length ? data : [{ name: "Serie", labels: ["A","B","C"], values: [1,2,3] }];

  slide.addChart(chartType, safeData, {
    x: px(ph.x), y: px(ph.y), w: px(ph.w), h: px(ph.h),
    showLegend: true
  });
}

// ---------- Render ----------
for (const s of (content.slides || [])) {
  slideNo++;
  const L = findLayout(s.layout);
  if (!L) throw new Error(`Layout nicht gefunden: ${s.layout}`);

  const slide = deck.addSlide();
  slide.background = { color: color.surface };

  const phTitle = findByType(L, "title") || findByType(L, "ctrTitle");
  const phSub   = findByType(L, "subTitle");
  if (phTitle) addTextBox(slide, phTitle, s.title, "heading");
  if (phSub && s.subtitle) addTextBox(slide, phSub, s.subtitle, "subheading", color.muted);

  const bodies = getBodies(L).slice().sort((a, b) => a.x - b.x);

  const zoneOrder = [
    ["content", s.content],
    ["left", s.left],
    ["right", s.right],
    ["notes", s.notes]
  ];

  for (const [zoneName, block] of zoneOrder) {
    if (!block) continue;
    let ph = (L.placeholders || []).find((p) => p.name === zoneName);
    if (!ph) {
      if (zoneName === "content") ph = bodies[0];
      else if (zoneName === "left") ph = bodies[0];
      else if (zoneName === "right") ph = bodies[1] || bodies[0];
      else ph = bodies[0];
    }
    if (!ph) continue;

    if (block.type === "richtext")      addBullets(slide, ph, block.bullets || [], "body");
    else if (block.type === "image")    addImageBox(slide, ph, block.url, block.alt);
    else if (block.type === "table")    addTable(slide, ph, block.rows);
    else if (block.type === "chart")    addChart(slide, ph, block);
  }

  for (const f of (L.footer || [])) {
    if (f.type === "sldNum") {
      addTextBox(slide, f, String(slideNo), "caption", color.onSurface);
    } else if (f.type === "dt") {
      const dateText = s.meta?.date || new Date().toISOString().slice(0, 10);
      addTextBox(slide, f, dateText, "caption", color.onSurface);
    } else if (f.type === "ftr") {
      const brand = String(get(tokens, "meta.brand.value") || "");
      if (brand) addTextBox(slide, f, brand, "caption", color.onSurface);
    }
  }
}

// ---------- Write ----------
ensureDir(outPath);
await deck.writeFile({ fileName: outPath });
console.log(`✅ Generated ${outPath}`);
