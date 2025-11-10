import fs from "fs";

// Map laden
const map = JSON.parse(fs.readFileSync("layouts/template_map.json", "utf-8"));

// Whitelist optional laden (nur freigegebene Layouts prüfen)
const wlPath = "rules/layout_whitelist.json";
const whitelist = fs.existsSync(wlPath)
  ? new Set(JSON.parse(fs.readFileSync(wlPath, "utf-8")))
  : null;

// Diese Typen NICHT prüfen (Titel/Untertitel/Datum/Fuß/Seitenzahl)
const SKIP_TYPES = new Set(["title", "ctrTitle", "subTitle", "dt", "sldNum", "ftr"]);

// Toleranzen: Kanten, die sich nur "berühren", zählen nicht als Overlap
const EPS = 0.5;      // px
const MIN_SIZE = 2;   // px (Rauschen filtern)

function intersects(a, b) {
  const ax1 = a.x, ay1 = a.y, ax2 = a.x + a.w, ay2 = a.y + a.h;
  const bx1 = b.x, by1 = b.y, bx2 = b.x + b.w, by2 = b.y + b.h;
  // Wenn sich Kanten nur berühren (<= EPS), kein Overlap
  if (ax2 <= bx1 + EPS || bx2 <= ax1 + EPS || ay2 <= by1 + EPS || by2 <= ay1 + EPS) return false;
  return true;
}

const layouts = (map.layouts || []).filter(L => !whitelist || whitelist.has(L.id));

const overlaps = [];
for (const L of layouts) {
  // Nur Body-Platzhalter prüfen (kein Titel/Footer/etc.), winzige Boxen ignorieren
  const bodies = (L.placeholders || []).filter(
    p => !SKIP_TYPES.has(p.type) && Number(p.w) > MIN_SIZE && Number(p.h) > MIN_SIZE
  );

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      if (intersects(bodies[i], bodies[j])) {
        const a = bodies[i].name || bodies[i].type;
        const b = bodies[j].name || bodies[j].type;
        overlaps.push(`${L.id}:${a} ↔ ${L.id}:${b}`);
      }
    }
  }
}

if (overlaps.length) {
  console.error("❌ Body overlaps found:\n - " + overlaps.join("\n - "));
  process.exit(1);
}
console.log("✅ No body overlaps");
