import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

const EMU_PER_INCH = 914400;
const PX_PER_INCH = 96;
const toPx = (emu, scale = 1) =>
  Math.round((Number(emu || 0) / EMU_PER_INCH) * PX_PER_INCH * scale);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true
});

async function readXml(zip, p) {
  const file = zip.file(p);
  if (!file) return null;
  const xml = await file.async("string");
  return parser.parse(xml);
}

async function getSlideSize(zip) {
  const pres = await readXml(zip, "ppt/presentation.xml");
  const sz = pres?.presentation?.sldSz || pres?.sldSz;
  const cx = Number(sz?.["@_cx"] || 12192000);
  const cy = Number(sz?.["@_cy"] || 6858000);
  return { cx, cy };
}

// — Placeholders extrahieren (ohne "slot"), idx als Number, Koordinaten clampen —
function extractPlaceholders(layoutXml, scaleX = 1, scaleY = 1) {
  const out = [];
  const spTree = layoutXml?.sldLayout?.cSld?.spTree;
  if (!spTree) return out;

  const shapes = []
    .concat(spTree.sp || [])
    .concat(spTree.grpSp || [])
    .flat();

  for (const sp of shapes) {
    const ph = sp?.nvSpPr?.nvPr?.ph;
    if (!ph) continue;

    const type = ph?.["@_type"] || "body";
    const rawIdx = ph?.["@_idx"];
    const idx = rawIdx !== undefined ? Number(rawIdx) : null;
    const name = sp?.nvSpPr?.cNvPr?.["@_name"] || type;

    const xfrm = sp?.spPr?.xfrm || {};
    const off = xfrm?.off || {};
    const ext = xfrm?.ext || {};

    // clamp >= 0, Mindestgröße 1px damit Schema (exclusiveMinimum) erfüllt ist
    const x = Math.max(0, toPx(off?.["@_x"] || 0, scaleX));
    const y = Math.max(0, toPx(off?.["@_y"] || 0, scaleY));
    const w = Math.max(1, toPx(ext?.["@_cx"] || 0, scaleX));
    const h = Math.max(1, toPx(ext?.["@_cy"] || 0, scaleY));

    let styleHint = "body";
    if (type === "title" || type === "ctrTitle") styleHint = "heading";
    if (type === "subTitle") styleHint = "subheading";

    out.push({ name, type, idx, x, y, w, h, styleHint });
  }
  return out;
}

async function main() {
  const inPath = process.argv[2] || "tools/map/template.pptx";
  const outPath = process.argv[3] || "layouts/template_map.json";

  if (!fs.existsSync(inPath)) {
    console.error(`Input not found: ${inPath}`);
    process.exit(1);
  }

  const buf = fs.readFileSync(inPath);
  const zip = await JSZip.loadAsync(buf);

  const { cx, cy } = await getSlideSize(zip);
  const W_PX = 1280;
  const scaleX = W_PX / toPx(cx, 1);
  const H_PX = Math.round(toPx(cy, 1) * scaleX);
  const scaleY = scaleX;

  const layoutFiles = Object.keys(zip.files)
    .filter((f) => f.startsWith("ppt/slideLayouts/slideLayout") && f.endsWith(".xml"))
    .sort((a, b) => a.localeCompare(b));

  const layouts = [];
  for (const lf of layoutFiles) {
    const lx = await readXml(zip, lf);
    if (!lx) continue;

    const root = lx?.sldLayout;
    const id = (root?.["@_type"] || root?.["@_name"] || path.basename(lf, ".xml")).toString();
    const name = root?.["@_name"] || id;
    const type = root?.["@_type"] || "custom";

    const all = extractPlaceholders(lx, scaleX, scaleY);

    // Footer strikt auf das erlaubte Set reduzieren
    const footer = all
      .filter((p) => ["dt", "sldNum", "ftr"].includes(p.type))
      .map(({ type, x, y, w, h }) => ({ type, x, y, w, h }));

    // Content-Placeholders ohne Footer-Einträge
    const placeholders = all.filter((p) => !["dt", "sldNum", "ftr"].includes(p.type));

    layouts.push({ id, pptxName: name, pptxType: type, file: lf, placeholders, footer });
  }

  const out = {
    spec_version: "1.0.0",
    source: path.basename(inPath),
    canvas: { w: W_PX, h: H_PX, unit: "px", emu: { cx, cy } },
    layouts
  };

  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf-8");
  console.log(`OK: wrote ${outPath} with ${layouts.length} layouts`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
