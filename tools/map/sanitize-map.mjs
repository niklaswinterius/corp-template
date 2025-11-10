import fs from "fs";

const inPath = process.argv[2] || "layouts/template_map.json";
if (!fs.existsSync(inPath)) {
  console.error(`Map not found: ${inPath}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inPath, "utf-8"));
const FOOT = new Set(["dt", "sldNum", "ftr"]);

for (const L of data.layouts || []) {
  const ph = Array.isArray(L.placeholders) ? L.placeholders : [];
  const keep = [];
  const footer = Array.isArray(L.footer) ? L.footer : [];

  for (const p of ph) {
    const t = p.type;
    // clamp
    const norm = {
      ...(p.name ? { name: p.name } : {}),
      ...(p.type ? { type: p.type } : {}),
      ...(Number.isFinite(p.idx) ? { idx: Number(p.idx) } : {}),
      x: Math.max(0, Number(p.x || 0)),
      y: Math.max(0, Number(p.y || 0)),
      w: Math.max(1, Number(p.w || 1)),
      h: Math.max(1, Number(p.h || 1))
    };

    if (FOOT.has(t)) {
      // pro Footer-Typ nur einen Eintrag behalten (letzter gewinnt)
      const i = footer.findIndex(f => f.type === t);
      const slim = { type: norm.type, x: norm.x, y: norm.y, w: norm.w, h: norm.h };
      if (i >= 0) footer[i] = slim; else footer.push(slim);
    } else {
      keep.push(norm);
    }
  }

  L.placeholders = keep;
  L.footer = footer;
}

fs.writeFileSync(inPath, JSON.stringify(data, null, 2));
console.log(`Sanitized: ${inPath} (moved footer types out of placeholders)`);
