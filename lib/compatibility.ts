import { COMBINATIONS, CONFLICTS, PROFILES } from "@/data/profiles";
import { DIMENSION_ORDER, type Dimension } from "@/data/questions";
import type { DimensionResult } from "@/lib/scoring";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function firstSentence(text: string): string {
  const m = /^(.*?[.!?])\s/.exec(text);
  return m ? m[1] : text;
}

function nameList(letters: Dimension[]): string {
  const names = letters.map((l) => PROFILES[l].name);
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function topLetter(results: DimensionResult[]): Dimension {
  return [...results].sort((a, b) => b.average - a.average)[0].letter;
}

export function codeMeaning(results: DimensionResult[]): string {
  const doms = results.filter((r) => r.capital).map((r) => r.letter);
  const top = [...results].sort((a, b) => b.average - a.average)[0];
  if (doms.length > 0) {
    const key = DIMENSION_ORDER.filter((l) => doms.includes(l)).join("");
    const combo = COMBINATIONS.find((c) => c.letters === key);
    if (combo) return `${combo.name} — ${combo.description}`;
    return `${PROFILES[top.letter].name}: ${PROFILES[top.letter].meaning}`;
  }
  return `No dominant dimension — ${PROFILES[top.letter].name} leans highest at ${top.average.toFixed(1)}.`;
}

/** Rewrite a first-person work entry ("Give me…", "I'll run…") as guidance about someone else. */
export function asGuidance(work: string): string {
  return work
    .replace(/\bI'll\b/g, "they'll")
    .replace(/\bI’m\b/g, "they're")
    .replace(/\bI'm\b/g, "they're")
    .replace(/\bI start\b/g, "they start")
    .replace(/\bmy\b/g, "their")
    .replace(/\bme\b/g, "them")
    .replace(/([.!?]\s+)they'll/g, "$1They'll");
}

/** "Two Producer drivers — great execution, competing pace, nobody looks ahead or holds people together." */
export function sameTopLine(
  letter: Dimension,
  raterResults: DimensionResult[]
): string {
  const absent = raterResults
    .filter((r) => !r.capital && r.letter !== letter)
    .map((r) => r.letter);
  const absence =
    absent.length === 0
      ? "nothing outside the four shows up"
      : `nobody ${absent.map((l) => PROFILES[l].essence).join(" or ")}`;
  return `Two ${PROFILES[letter].name} drivers — great execution, competing pace, ${absence}.`;
}

// ---------------------------------------------------------------------------
// Compatibility engine (Rate Your People)
// ---------------------------------------------------------------------------

export type Tier = "Best fit" | "Good fit" | "Watch out" | "High friction";

export interface CompatibilityReport {
  tier: Tier;
  reasons: string[];
  sharedGaps: Dimension[];
  whatWorks: string;
  watchFor: string;
  whereWeLack: string;
}

export function tierTone(tier: Tier): string {
  switch (tier) {
    case "Best fit":
      return "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30";
    case "Good fit":
      return "bg-white/10 text-white/70 ring-white/20";
    case "Watch out":
      return "bg-amber-400/10 text-amber-300 ring-amber-400/30";
    case "High friction":
      return "bg-rose-400/10 text-rose-300 ring-rose-400/30";
  }
}

/**
 * Two codes → tier + reasons + shared gaps.
 * Tier ladder (spec rule skeleton, weights resolved here):
 * 1. High mutual coverage (both directions, generous) → Best fit — a named
 *    tension does not outvote genuine complement.
 * 2. Tops both dominant and the same letter → Watch out (competing pace).
 * 3. Tops both dominant and a CONFLICTS pair → High friction if one side is
 *    missing the other's top letter, else Watch out.
 * 4. Any other conflict across dominant sets → Watch out.
 * 5. Otherwise → Good fit.
 * Shared gaps never drive the tier but are named in every report.
 */
export function computeCompatibility(
  rater: DimensionResult[],
  perceived: DimensionResult[]
): CompatibilityReport {
  const byR = new Map(rater.map((r) => [r.letter, r]));
  const byP = new Map(perceived.map((r) => [r.letter, r]));

  const rTop = topLetter(rater);
  const pTop = topLetter(perceived);
  const rTopDom = byR.get(rTop)!.capital;
  const pTopDom = byP.get(pTop)!.capital;
  const topsBothDom = rTopDom && pTopDom;

  const theirDoms = perceived.filter((r) => r.capital).map((r) => r.letter);
  const myDoms = rater.filter((r) => r.capital).map((r) => r.letter);
  const myGaps = rater.filter((r) => !r.capital).map((r) => r.letter);
  const theirGaps = perceived.filter((r) => !r.capital).map((r) => r.letter);

  const theyCoverMe = theirDoms.filter((l) => myGaps.includes(l));
  const iCoverThem = myDoms.filter((l) => theirGaps.includes(l));
  const coverageScore = theyCoverMe.length + iCoverThem.length;
  const mutualStrong =
    theyCoverMe.length >= 1 && iCoverThem.length >= 1 && coverageScore >= 3;

  const sharedGaps = DIMENSION_ORDER.filter(
    (l) => byR.get(l)!.rank === "Missing" && byP.get(l)!.rank === "Missing"
  );

  const topConflict = CONFLICTS.find(
    (c) =>
      (c.a === rTop && c.b === pTop) || (c.b === rTop && c.a === pTop)
  );
  const sameTop = rTop === pTop;
  const missingOthersTop =
    byR.get(pTop)!.rank === "Missing" || byP.get(rTop)!.rank === "Missing";

  const domConflict = CONFLICTS.find(
    (c) =>
      (myDoms.includes(c.a) && theirDoms.includes(c.b)) ||
      (myDoms.includes(c.b) && theirDoms.includes(c.a))
  );

  let tier: Tier = "Good fit";
  if (mutualStrong) tier = "Best fit";
  else if (topConflict && topsBothDom)
    tier = missingOthersTop ? "High friction" : "Watch out";
  else if (sameTop && topsBothDom) tier = "Watch out";
  else if (domConflict) tier = "Watch out";

  // Reasons — built only from PROFILES / CONFLICTS language.
  const reasons: string[] = [];

  if (theyCoverMe.length > 0 || iCoverThem.length > 0) {
    const parts: string[] = [];
    if (theyCoverMe.length > 0) {
      const verb = theyCoverMe.length === 1 ? "covers" : "cover";
      parts.push(
        `Their ${nameList(theyCoverMe)} ${verb} what you skip — ${theyCoverMe
          .map((l) => PROFILES[l].covers)
          .join(", and ")}.`
      );
    }
    if (iCoverThem.length > 0) {
      parts.push(
        `You cover their ${nameList(iCoverThem)} — ${iCoverThem
          .map((l) => PROFILES[l].essence)
          .join(", and ")}.`
      );
    }
    reasons.push(parts.join(" "));
  } else {
    reasons.push("No big coverage swap between you — you work the same ground.");
  }

  if (topConflict && topsBothDom) {
    reasons.push(
      `${topConflict.title} — ${firstSentence(topConflict.description)}`
    );
  } else if (sameTop && topsBothDom) {
    reasons.push(sameTopLine(rTop, rater));
  } else if (domConflict) {
    reasons.push(
      `${domConflict.title} — ${firstSentence(domConflict.description)}`
    );
  }

  if (sharedGaps.length > 0) {
    reasons.push(
      `Between you, nobody holds the ${nameList(
        sharedGaps
      )} side — tension would go unspoken.`
    );
  }

  const whatWorks = reasons[0];
  const watchFor =
    reasons.slice(1).find((r) => !r.startsWith("Between you")) ??
    (sharedGaps.length > 0
      ? `Between you, nobody holds the ${nameList(sharedGaps)} side — tension would go unspoken.`
      : "Nothing sharp between you — the usual friction of any pairing.");
  const rWeak = [...rater].sort((a, b) => a.average - b.average)[0];
  const pWeak = [...perceived].sort((a, b) => a.average - b.average)[0];
  const whereWeLack =
    sharedGaps.length > 0
      ? `Between you, nobody holds the ${nameList(sharedGaps)} side — tension would go unspoken.`
      : `You are weakest on ${PROFILES[rWeak.letter].name} (${rWeak.average.toFixed(1)}); they are weakest on ${PROFILES[pWeak.letter].name} (${pWeak.average.toFixed(1)}).`;

  return {
    tier,
    reasons: reasons.slice(0, 3),
    sharedGaps,
    whatWorks,
    watchFor,
    whereWeLack,
  };
}

// ---------------------------------------------------------------------------
// "Who I work best with" (results page, Update A2)
// ---------------------------------------------------------------------------

export interface BestWithCard {
  kind: "complement" | "specialist" | "friction" | "note";
  letters: string;
  title: string;
  badge: string;
  lines: string[];
  workLine: string;
}

/**
 * Up to 3 cards for a code: best complement (the letters you skip),
 * a single-letter specialist for your biggest gap, and the friction profile.
 * All reason text pulls from PROFILES / CONFLICTS / COMBINATIONS.
 */
export function buildBestWith(results: DimensionResult[]): BestWithCard[] {
  const doms = results
    .filter((r) => r.capital)
    .sort((a, b) => b.average - a.average)
    .map((r) => r.letter);
  const nonDoms = [...results]
    .filter((r) => !r.capital)
    .sort((a, b) => a.average - b.average);
  const cards: BestWithCard[] = [];

  // No dominant dimension — generic "try leaning in" cards.
  if (doms.length === 0) {
    const top2 = [...results].sort((a, b) => b.average - a.average).slice(0, 2);
    for (const r of top2) {
      const p = PROFILES[r.letter];
      cards.push({
        kind: "note",
        letters: r.letter.toLowerCase(),
        title: `Try leaning into ${p.name}`,
        badge: "This semester",
        lines: [
          p.meaning,
          `One semester of deliberately turning ${p.name} up tells you more than another year of guessing.`,
        ],
        workLine: asGuidance(p.work.delegate),
      });
    }
    return cards;
  }

  // Card 1 — best complement: every letter you are not dominant in.
  if (nonDoms.length > 0) {
    const letters = DIMENSION_ORDER.filter((l) =>
      nonDoms.some((r) => r.letter === l)
    );
    const key = letters.join("");
    const combo = COMBINATIONS.find((c) => c.letters === key);
    const lines = letters
      .slice(0, 2)
      .map((l) => `Their ${PROFILES[l].name} covers what you skip — ${PROFILES[l].covers}.`);
    if (combo && lines.length < 3) lines.push(combo.description);
    cards.push({
      kind: "complement",
      letters: key,
      title: combo ? combo.name : letters.map((l) => PROFILES[l].name).join(" + "),
      badge: "Best complement",
      lines,
      workLine: asGuidance(PROFILES[letters[0]].work.delegate),
    });

    // Card 2 — single-letter specialist for your biggest gap (skip if it
    // would duplicate card 1).
    if (nonDoms.length >= 2) {
      const gap = nonDoms[0];
      const p = PROFILES[gap.letter];
      cards.push({
        kind: "specialist",
        letters: gap.letter,
        title: `Strong ${p.name}`,
        badge: "Specialist",
        lines: [
          `One strong ${p.name} takes your lowest score (${gap.average.toFixed(
            1
          )}) off your plate — ${p.covers}.`,
          `You keep the pace on ${nameList(doms)}; they hold the side you drop.`,
        ],
        workLine: asGuidance(p.work.pitch),
      });
    }
  }

  // Card 3 — friction profile.
  if (doms.length >= 2) {
    const key = DIMENSION_ORDER.filter((l) => doms.includes(l)).join("");
    const combo = COMBINATIONS.find((c) => c.letters === key);
    const absent = results.filter((r) => !r.capital).map((r) => r.letter);
    const absence =
      absent.length === 0
        ? "nothing outside the four shows up"
        : `nobody ${absent.map((l) => PROFILES[l].essence).join(" or ")}`;
    cards.push({
      kind: "friction",
      letters: key,
      title: combo ? `Another ${combo.name}` : `Another ${key}`,
      badge: "Friction profile",
      lines: [
        `Same top letter: two ${PROFILES[doms[0]].name} drivers — great execution, competing pace, ${absence}.`,
        ...(combo ? [combo.description] : []),
      ],
      workLine:
        "One of you will win and the other will feel ignored — decide up front who owns pace and who owns the plan.",
    });
  } else if (doms.length === 1) {
    const top = doms[0];
    const pair = CONFLICTS.find((c) => c.a === top || c.b === top)!;
    const partner = pair.a === top ? pair.b : pair.a;
    const key = DIMENSION_ORDER.filter((l) => l === top || l === partner).join(
      ""
    );
    const combo = COMBINATIONS.find((c) => c.letters === key);
    cards.push({
      kind: "friction",
      letters: key,
      title: combo ? `A ${combo.name}` : key,
      badge: "Friction profile",
      lines: [`${pair.title} — ${pair.description}`],
      workLine:
        "Name the tension before the work starts — one of you owns pace, the other owns the plan.",
    });
  } else {
    // All four dominant — the only friction is another Complete Manager.
    cards.push({
      kind: "friction",
      letters: "PAEI",
      title: "Another Complete Manager",
      badge: "Friction profile",
      lines: [
        "Strong in all four. Very rare — good at everything but master of nothing.",
        "Two Complete Managers compete for every seat.",
      ],
      workLine:
        "Agree who owns which seat before the first disagreement — otherwise every decision is a duel.",
    });
  }

  return cards.slice(0, 3);
}
