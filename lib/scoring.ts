import { DIMENSION_ORDER, QUESTIONS, type Dimension } from "@/data/questions";
import {
  COMBINATIONS,
  CONFLICTS,
  PROFILES,
  type Combination,
  type Conflict,
} from "@/data/profiles";

export type Rank = "Very Dominant" | "Dominant" | "Secondary" | "Missing";

export interface DimensionResult {
  letter: Dimension;
  average: number;
  rank: Rank;
  capital: boolean;
}

export function rankFromAverage(avg: number): Rank {
  if (avg >= 4.5) return "Very Dominant";
  if (avg >= 3.5) return "Dominant";
  if (avg >= 2.5) return "Secondary";
  return "Missing";
}

function isCapital(rank: Rank): boolean {
  return rank === "Very Dominant" || rank === "Dominant";
}

/** answers: 20 values aligned with QUESTIONS order (1-5). Unanswered (0) is skipped. */
export function computeResults(answers: number[]): DimensionResult[] {
  const buckets: Record<Dimension, number[]> = { P: [], A: [], E: [], I: [] };

  QUESTIONS.forEach((q, i) => {
    const a = answers[i];
    if (a >= 1 && a <= 5) buckets[q.dimension].push(a);
  });

  return DIMENSION_ORDER.map((letter) => {
    const values = buckets[letter];
    const raw = values.length
      ? values.reduce((sum, v) => sum + v, 0) / values.length
      : 0;
    const average = Math.round(raw * 10) / 10;
    const rank = rankFromAverage(average);
    return { letter, average, rank, capital: isCapital(rank) };
  });
}

export function buildCode(results: DimensionResult[]): string {
  return results
    .map((r) => (r.capital ? r.letter : r.letter.toLowerCase()))
    .join("");
}

export function uniqueDominant(results: DimensionResult[]): Dimension | null {
  const capitals = results.filter((r) => r.capital);
  return capitals.length === 1 ? capitals[0].letter : null;
}

interface ComboMatch {
  combo: Combination;
  fit: "Dominant fit" | "Present fit";
}

/**
 * Match the user's profile against the combination list.
 * A combination needs every letter present (not Missing) to qualify.
 * Longer combos make stronger claims ("Complete Manager" = strong in all
 * four), so 3+ letter combos only appear when every letter is dominant;
 * otherwise the 2-letter patterns carry the read.
 * "Dominant fit" = every letter is a natural strength; "Present fit" =
 * all present but not all dominant. Most dominant letters first, then
 * shorter/more specific combos, and combos fully contained in an
 * already-shown combo are skipped.
 */
export function matchCombinations(results: DimensionResult[]): ComboMatch[] {
  const byLetter = new Map(results.map((r) => [r.letter, r]));

  const strength = (l: Dimension): number => {
    const r = byLetter.get(l);
    if (!r || r.rank === "Missing") return 0;
    return r.capital ? 2 : 1;
  };

  const candidates = COMBINATIONS.map((combo) => {
    const letters = combo.letters.split("") as Dimension[];
    const strengths = letters.map(strength);
    if (strengths.some((s) => s === 0)) return null;
    const dominantCount = strengths.filter((s) => s === 2).length;
    const totalStrength = strengths.reduce((sum, s) => sum + s, 0);
    // A 3+ letter combo claims integrated strength across those dimensions —
    // only show it when every letter is actually dominant.
    if (letters.length >= 3 && dominantCount !== letters.length) return null;
    return {
      combo,
      dominantCount,
      totalCount: letters.length,
      totalStrength,
      fit: dominantCount === letters.length
        ? ("Dominant fit" as const)
        : ("Present fit" as const),
    };
  }).filter((c): c is NonNullable<typeof c> => c !== null);

  candidates.sort(
    (a, b) =>
      b.dominantCount - a.dominantCount ||
      a.totalCount - b.totalCount ||
      b.totalStrength - a.totalStrength
  );

  const picked: ComboMatch[] = [];
  for (const c of candidates) {
    const letters = c.combo.letters.split("");
    const covered = picked.some((p) => {
      const pl = p.combo.letters.split("");
      return (
        pl.length > letters.length &&
        letters.every((l) => pl.includes(l)) &&
        p.fit === c.fit
      );
    });
    if (!covered) picked.push({ combo: c.combo, fit: c.fit });
    if (picked.length >= 3) break;
  }
  return picked;
}

export type ConflictKind = "Tension" | "Blind spot";

export interface ConflictMatch {
  conflict: Conflict;
  kind: ConflictKind;
  gap: number;
}

/**
 * Surface the dimensions that pull against each other in this profile.
 * "Tension" = both sides are present but at different strengths.
 * "Blind spot" = one side runs strong while the other is missing.
 */
export function findConflicts(results: DimensionResult[]): ConflictMatch[] {
  const byLetter = new Map(results.map((r) => [r.letter, r]));
  const matches: ConflictMatch[] = [];

  for (const conflict of CONFLICTS) {
    const ra = byLetter.get(conflict.a);
    const rb = byLetter.get(conflict.b);
    if (!ra || !rb) continue;
    const gap = Math.abs(ra.average - rb.average);

    const aPresent = ra.rank !== "Missing";
    const bPresent = rb.rank !== "Missing";
    const aStrong = ra.average >= 3.5;
    const bStrong = rb.average >= 3.5;

    if (aPresent && bPresent && gap >= 0.5) {
      matches.push({ conflict, kind: "Tension", gap });
    } else if ((aStrong && !bPresent) || (bStrong && !aPresent)) {
      matches.push({ conflict, kind: "Blind spot", gap });
    }
  }

  matches.sort((x, y) => {
    if (x.kind !== y.kind) return x.kind === "Tension" ? -1 : 1;
    return y.gap - x.gap;
  });
  return matches.slice(0, 3);
}

export function buildSummary(
  results: DimensionResult[],
  combos: ComboMatch[],
  code: string
): string {
  const byLetter = new Map(results.map((r) => [r.letter, r]));
  const sorted = [...results].sort((a, b) => b.average - a.average);
  const top = sorted[0];
  const topProfile = PROFILES[top.letter];
  const weakest = sorted[sorted.length - 1];
  const weakestProfile = PROFILES[weakest.letter];
  const dominant = results.filter((r) => r.capital);
  const sole = uniqueDominant(results);

  const topCombo = combos.find((c) => c.fit === "Dominant fit") ?? combos[0];

  let body: string;

  if (sole) {
    const presentOthers = results
      .filter((r) => r.letter !== sole && r.rank !== "Missing")
      .map((r) => PROFILES[r.letter].name);
    body =
      `You lead through ${topProfile.name}: ${topProfile.meaning.replace(/^The \w+ is the part of you that /, "").replace(/^./, (c) => c.toLowerCase())} ` +
      (presentOthers.length > 0
        ? `While ${presentOthers.join(" and ")} ${presentOthers.length > 1 ? "are" : "is"} present in your profile, ${topProfile.name} is what people feel first. `
        : "") +
      `The pure version of this carries a nickname, "${topProfile.nickname}", but your code shows more than the stereotype. ` +
      `Your growth edge is ${weakestProfile.name}: ${weakestProfile.weaknesses[0].toLowerCase()}. That is where a teammate strong in ${weakestProfile.name} would change everything.`;
  } else if (dominant.length >= 2) {
    const names = dominant.map((r) => PROFILES[r.letter].name);
    const nameList =
      names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
    body =
      `Your code is ${code}, and it runs on ${nameList}. ` +
      (topCombo
        ? `The clearest way to read it: ${topCombo.combo.name} - ${topCombo.combo.description.charAt(0).toLowerCase()}${topCombo.combo.description.slice(1)} `
        : "") +
      `With ${dominant.length} natural strengths you can shift roles depending on what the moment needs, which is powerful, as long as you decide who leads in a given situation instead of letting the loudest dimension take over. ` +
      `Meanwhile ${weakestProfile.name} sits quiet: ${weakestProfile.meaning.replace(/^The \w+ is the part of you that /, "").replace(/^./, (c) => c.toLowerCase())} ` +
      `That gap is not a flaw; it is a hiring hint.`;
  } else {
    body =
      `Your code is ${code}. No dimension screams dominance, and that is not a failure. It usually means one of two things: you are early in your leadership journey and still exploring, or you spread yourself evenly across roles and never let one voice get loud. ` +
      `Your relatively strongest lean is ${topProfile.name} (${top.average.toFixed(1)}), with ${weakestProfile.name} at ${weakest.average.toFixed(1)}. ` +
      `The useful move from here is deliberate: pick the dimension your current goal needs most, and practice turning that one up on purpose.`;
  }

  return body;
}

export function rankTone(rank: Rank): string {
  switch (rank) {
    case "Very Dominant":
      return "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30";
    case "Dominant":
      return "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20";
    case "Secondary":
      return "bg-white/5 text-white/70 ring-white/15";
    case "Missing":
      return "bg-white/5 text-white/40 ring-white/10";
  }
}
