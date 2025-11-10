import fs from "fs";
import { createLogger } from "../utils/debug-logger.mjs";

const logger = createLogger('list-candidates');
const map = JSON.parse(fs.readFileSync("layouts/template_map.json","utf-8"));

const SKIP = new Set(["title","ctrTitle","subTitle","dt","sldNum","ftr"]);
// Enhanced overlap detection with area calculation
const AABB = (a, b) => {
    if (!(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y)) {
        const overlapWidth = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const overlapHeight = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        const overlapArea = overlapWidth * overlapHeight;
        const minArea = Math.min(a.w * a.h, b.w * b.h);
        return overlapArea > (0.05 * minArea); // 5% overlap threshold
    }
    return false;
};
const canvas = map.canvas||{w:1280,h:720};
const minBodyArea = 0.18 * (canvas.w*canvas.h); // mind. 18% Nutzfläche pro Body

function isClean(L) {
    logger.log(`Validating layout ${L.id}`);
    const ph = (L.placeholders||[]);
    
    // Title validation
    const hasTitle = ph.some(p=>p.type==="title"||p.type==="ctrTitle");
    if (!hasTitle) {
        logger.log(`Layout ${L.id} rejected: missing title`);
        return false;
    }

    // Body validation
    const bodies = ph.filter(p=>!SKIP.has(p.type));
    logger.log(`Layout ${L.id}: found ${bodies.length} body elements`);
    
    if (bodies.length < 1 || bodies.length > 2) {
        logger.log(`Layout ${L.id} rejected: invalid body count (${bodies.length})`);
        return false;
    }

    // Size validation
    for (const body of bodies) {
        const area = body.w * body.h;
        if (area < minBodyArea) {
            logger.log(`Layout ${L.id} rejected: body area too small (${area} < ${minBodyArea})`);
            return false;
        }
    }

    // Overlap validation
    if (bodies.length === 2 && AABB(bodies[0], bodies[1])) {
        logger.log(`Layout ${L.id} rejected: body elements overlap`);
        return false;
    }

    logger.log(`Layout ${L.id} passed validation`);
    return true;
}

const cand = (map.layouts||[]).filter(isClean).map(L=>({
  id: L.id,
  name: L.pptxName || "",
  bodies: L.placeholders.filter(p=>!SKIP.has(p.type)).length
}));

// Auswahlregel: bevorzugt 1× „1 Body“, 1× „2 Bodies“ + evtl. TitleOnly/Section/Blank
const oneBody = cand.filter(c=>c.bodies===1);
const twoBody = cand.filter(c=>c.bodies===2);

// heuristische Namensauswahl
const byName = (arr, needles)=>arr.find(c=>needles.some(n=>c.name.toLowerCase().includes(n)));

const pick = [];
if (twoBody.length) pick.push(byName(twoBody,["two content","comparison","two column"]) || twoBody[0]);
if (oneBody.length) pick.push(byName(oneBody,["title and content","content"]) || oneBody[0]);

// optional: Title Only / Section Header / Blank wenn vorhanden und clean
const opt = cand.filter(c=>/title only|section|blank/i.test(c.name));
for (const c of opt) if (!pick.find(p=>p.id===c.id)) pick.push(c);

// Whitelist schreiben
const ids = pick.map(p=>p.id);
fs.mkdirSync("rules",{recursive:true});
fs.writeFileSync("rules/layout_whitelist.json", JSON.stringify(ids, null, 2));
console.log("Whitelist:", ids);
console.log("All clean candidates:", cand);
