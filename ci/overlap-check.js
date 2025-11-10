import fs from "fs";
const map = JSON.parse(fs.readFileSync("layouts/template_map.json", "utf-8"));
const wlPath = "rules/layout_whitelist.json";
const whitelist = fs.existsSync(wlPath) ? new Set(JSON.parse(fs.readFileSync(wlPath, "utf-8"))) : null;

const SKIP_TYPES = new Set(["title","ctrTitle","subTitle","dt","sldNum","ftr"]);
const AABB = (a,b)=>!(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);
const layouts = (map.layouts||[]).filter(L => !whitelist || whitelist.has(L.id));

const overlaps=[];
for (const L of layouts) {
  const bodies = (L.placeholders||[]).filter(p=>!SKIP_TYPES.has(p.type));
  for (let i=0;i<bodies.length;i++) for (let j=i+1;j<bodies.length;j++)
    if (AABB(bodies[i],bodies[j]))
      overlaps.push(`${L.id}:${bodies[i].name||bodies[i].type} ↔ ${L.id}:${bodies[j].name||bodies[j].type}`);
}
if (overlaps.length) { console.error("❌ Body overlaps found:\n - "+overlaps.join("\n - ")); process.exit(1); }
console.log("✅ No body overlaps");
