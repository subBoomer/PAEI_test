import { computePerceivedResults, parseManualCode } from "./lib/perception";
import { computeCompatibility, buildBestWith, codeMeaning, asGuidance, tierTone } from "./lib/compatibility";
import { computeResults, buildCode, type DimensionResult } from "./lib/scoring";

function fromAnswers(answers: number[]): DimensionResult[] {
  return computeResults(answers);
}

// ---- parseManualCode ----
const manual = parseManualCode("PAei");
console.log("manual PAei:", manual?.code, manual?.results.map((r) => `${r.letter}:${r.average}`).join(" "));
console.log("manual bad:", parseManualCode("XYZQ") === null ? "PASS" : "FAIL");
console.log("manual short:", parseManualCode("PAE") === null ? "PASS" : "FAIL");

// ---- Perceived code from 16 answers ----
// P dom (4,4,4,4), A sec (3,3,3,3), E sec (3,3,3,3), I dom (4,4,4,4)
const perceived = computePerceivedResults([4,4,4,4, 3,3,3,3, 3,3,3,3, 4,4,4,4]);
console.log("perceived code:", buildCode(perceived));

// ---- Compatibility tiers ----
const PA = fromAnswers([5,5,4,5,5, 4,4,4,4,4, 3,3,3,3,3, 3,2,3,3,3]); // PAei
const EI = fromAnswers([2,2,2,2,2, 2,2,2,2,2, 4,5,4,5,5, 4,4,5,4,4]); // eiEI (E,I dom)
const PA2 = fromAnswers([5,4,5,4,5, 4,4,4,4,4, 3,3,3,3,3, 3,3,3,3,3]); // PAei variant
const Ponly = fromAnswers([5,5,5,4,5, 3,3,2,3,3, 3,3,2,3,3, 3,3,2,3,3]); // P + A sec, E missing
const Aonly = fromAnswers([3,3,3,3,3, 5,5,5,4,5, 2,2,2,2,2, 3,3,3,3,3]); // A dom, E missing

const cases: [string, DimensionResult[], DimensionResult[]][] = [
  ["PAei vs eiEI (mutual complement)", PA, EI],
  ["PAei vs PAei (same top)", PA, PA2],
  ["P-heavy vs A-heavy (conflict pair, E missing both)", Ponly, Aonly],
  ["PAei vs P-heavy (partial)", PA, Ponly],
];

for (const [label, a, b] of cases) {
  const r = computeCompatibility(a, b);
  console.log(`\n=== ${label} ===`);
  console.log("codes:", buildCode(a), "vs", buildCode(b));
  console.log("tier:", r.tier, "| tone ok:", tierTone(r.tier).includes("ring") ? "PASS" : "FAIL");
  console.log("reasons:");
  for (const line of r.reasons) console.log("  -", line);
  console.log("whatWorks:", r.whatWorks);
  console.log("watchFor:", r.watchFor);
  console.log("whereWeLack:", r.whereWeLack);
}

// ---- Best-with cards (A2) ----
console.log("\n=== buildBestWith PAei ===");
for (const card of buildBestWith(PA)) {
  console.log(`[${card.badge}] ${card.letters} — ${card.title}`);
  for (const l of card.lines) console.log("   ", l);
  console.log("    work:", card.workLine);
}

console.log("\n=== buildBestWith paei (none dominant) ===");
const paei = fromAnswers([2,2,2,2,2, 2,2,2,2,2, 2,2,2,2,2, 2,2,2,2,2]);
for (const card of buildBestWith(paei)) {
  console.log(`[${card.badge}] ${card.letters} — ${card.title}`);
}

console.log("\n=== buildBestWith PAEI (all dominant) ===");
const PAEI = fromAnswers([5,5,5,4,5, 5,4,5,5,4, 5,5,4,5,5, 4,5,5,4,5]);
for (const card of buildBestWith(PAEI)) {
  console.log(`[${card.badge}] ${card.letters} — ${card.title}`);
  for (const l of card.lines) console.log("   ", l);
}

// ---- codeMeaning + asGuidance ----
console.log("\ncodeMeaning PAei:", codeMeaning(PA));
console.log("asGuidance E delegate:", asGuidance("Give me the problem, not the solution. Check direction, not steps."));
console.log("asGuidance A delegate:", asGuidance("Set scope, roles, and timeline up front. I'll run it tightly once the frame is clear."));
