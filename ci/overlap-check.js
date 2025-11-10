import fs from "fs";

const map = JSON.parse(fs.readFileSync("layouts/template_map.json", "utf-8"));
const overlaps = [];
const AABB = (a,b) => !(a.x+a.w<=b.x || b.x+b.w<=a.x || a.y+a.h<=b.y || b.y+b.h<=a.y);

for (const L of map.layouts || []) {
  const boxes = []
    .concat(L.placeholders || [])
    .concat(L.footer || [])
    .map(p => ({...p, _id: `${L.id}:${p.name || p.type}`}));

  for (let i=0;i<boxes.length;i++) {
    for (let j=i+1;j<boxes.length;j++) {
      if (AABB(boxes[i], boxes[j])) overlaps.push(`${boxes[i]._id} ↔ ${boxes[j]._id}`);
    }
  }
}

if (overlaps.length) {
  console.error("❌ Overlaps found:\n - " + overlaps.join("\n - "));
  process.exit(1);
}
console.log("✅ No overlaps");
