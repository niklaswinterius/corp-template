import fs from "fs";

const tokens = JSON.parse(fs.readFileSync("tokens/brand.tokens.json", "utf-8"));

const toRGB = (h) => {
  const x = h.replace("#", "").trim();
  return { r: parseInt(x.slice(0,2),16)/255, g: parseInt(x.slice(2,4),16)/255, b: parseInt(x.slice(4,6),16)/255 };
};
const lin = (c) => (c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4));
const L = (hex) => { const {r,g,b} = toRGB(hex); return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b); };
const contrast = (fg, bg) => { const a=L(fg), b=L(bg); const [hi,lo]=a>b?[a,b]:[b,a]; return (hi+0.05)/(lo+0.05); };

const get = (path) => path.split(".").reduce((o,k)=>o?.[k], tokens);
const minAA = get("constraints.minContrastAA.value");

const pairs = [
  ["semantic.color.onSurface.value", "semantic.color.surface.value", "onSurface/surface"],
  ["semantic.color.onPrimary.value", "semantic.color.primary.value", "onPrimary/primary"]
];

let failed = false;
for (const [fgPath, bgPath, label] of pairs) {
  const fg = get(fgPath), bg = get(bgPath);
  if (!fg || !bg) { console.error(`❌ Missing ${label}`); failed = true; continue; }
  const c = contrast(fg, bg);
  if (c < minAA) { console.error(`❌ Contrast ${label} = ${c.toFixed(2)} < ${minAA}`); failed = true; }
  else { console.log(`✅ Contrast ${label} = ${c.toFixed(2)} ≥ ${minAA}`); }
}
if (failed) process.exit(1);
