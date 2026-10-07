import { PROFILES } from "@/data/profiles";
import type { Dimension } from "@/data/questions";
import {
  type DimensionResult,
  type Rank,
  computeResults,
  rankFromAverage,
} from "@/lib/scoring";

/**
 * Parse a pasted share link or bare answer string into 20 answers.
 * Accepts:
 *   https://site/results#paei=43521...
 *   #paei=43521...
 *   43521... (exactly 20 digits, each 0-5)
 */
export function parseAnswerString(raw: string): number[] | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const hashMatch = /paei=([0-9]{20})/.exec(trimmed);
  const digits = hashMatch ? hashMatch[1] : trimmed;
  if (!/^[0-5]{20}$/.test(digits)) return null;
  // A valid completed set has no zeros (0 = unanswered).
  if (digits.includes("0")) return null;
  return digits.split("").map(Number);
}

export interface PairMember {
  results: DimensionResult[];
  code: string;
}

export function memberFromAnswers(answers: number[]): PairMember {
  const results = computeResults(answers);
  const code = results
    .map((r) => (r.capital ? r.letter : r.letter.toLowerCase()))
    .join("");
  return { results, code };
}

export interface PairComplement {
  letter: Dimension;
  strong: "A" | "B";
  note: string;
}

export interface PairTension {
  a: Dimension;
  b: Dimension;
  title: string;
  note: string;
}

export interface PairInsight {
  complements: PairComplement[];
  tensions: PairTension[];
  summary: string;
}

const byLetter = (rs: DimensionResult[]) =>
  new Map(rs.map((r) => [r.letter, r]));

/**
 * Compare two profiles: where they cover each other's gaps,
 * and which classic PAEI tensions run live *between* the two people.
 */
export function pairInsights(mA: PairMember, mB: PairMember): PairInsight {
  const a = byLetter(mA.results);
  const b = byLetter(mB.results);
  const complements: PairComplement[] = [];
  const tensions: PairTension[] = [];

  for (const letter of ["P", "A", "E", "I"] as Dimension[]) {
    const ra = a.get(letter)!;
    const rb = b.get(letter)!;
    const name = PROFILES[letter].name;

    // One strong, the other missing → the classic coverage gap.
    if (ra.capital && rb.rank === "Missing") {
      complements.push({
        letter,
        strong: "A",
        note: `${name} is a natural strength for A but missing for B: this role will fall on A unless it is consciously shared.`,
      });
    } else if (rb.capital && ra.rank === "Missing") {
      complements.push({
        letter,
        strong: "B",
        note: `${name} is a natural strength for B but missing for A: this role will fall on B unless it is consciously shared.`,
      });
    } else if (ra.capital && !rb.capital) {
      complements.push({
        letter,
        strong: "A",
        note: `A leads on ${name} (${ra.average.toFixed(1)} vs ${rb.average.toFixed(1)}). Let A own this dimension by default.`,
      });
    } else if (rb.capital && !ra.capital) {
      complements.push({
        letter,
        strong: "B",
        note: `B leads on ${name} (${rb.average.toFixed(1)} vs ${ra.average.toFixed(1)}). Let B own this dimension by default.`,
      });
    }
  }

  // Live tensions between people: classic pair (P-A, E-A, P-I, E-I)
  // where one person leans one side and the other leans the other side.
  const PAIRS: [Dimension, Dimension, string][] = [
    ["P", "A", "Speed vs. Structure"],
    ["E", "A", "Change vs. Stability"],
    ["P", "I", "Results vs. People"],
    ["E", "I", "Risk vs. Harmony"],
  ];

  for (const [x, y, title] of PAIRS) {
    const ax = a.get(x)!;
    const ay = a.get(y)!;
    const bx = b.get(x)!;
    const by = b.get(y)!;
    // A leans x while B leans y (or mirrored) — the tension lives between them.
    const crossed =
      ax.average - ay.average >= 1.0 && by.average - bx.average >= 1.0;
    const mirrored =
      ay.average - ax.average >= 1.0 && bx.average - by.average >= 1.0;
    if (crossed || mirrored) {
      const [lead, follow] = crossed ? [x, y] : [y, x];
      tensions.push({
        a: lead,
        b: follow,
        title,
        note: `A leans ${PROFILES[lead].name} while B leans ${PROFILES[follow].name}. Expect friction on this axis: name it early and decide who decides.`,
      });
    }
  }

  // Summary
  const capA = mA.results.filter((r) => r.capital).map((r) => r.letter);
  const capB = mB.results.filter((r) => r.capital).map((r) => r.letter);
  const parts: string[] = [];
  parts.push(
    `You are ${mA.code} and your partner is ${mB.code}. ` +
      (capA.length === 0
        ? "A has no dominant dimension, "
        : `A's natural strengths: ${capA.join(", ")}. `) +
      (capB.length === 0
        ? "B has no dominant dimension."
        : `B's natural strengths: ${capB.join(", ")}.`)
  );
  if (complements.length > 0) {
    parts.push(
      `You cover each other on ${complements
        .map((c) => c.letter)
        .join(", ")}: the gaps do not overlap, which is exactly what a founding team needs.`
    );
  } else {
    parts.push(
      "Your strengths overlap rather than complement: powerful when aligned, but expect competition for the same seats."
    );
  }
  if (tensions.length > 0) {
    parts.push(
      `The live tension between you is ${tensions
        .map((t) => t.title.toLowerCase())
        .join(" and ")}.`
    );
  } else {
    parts.push(
      "No strong crossed tensions between you: your conflicts will come from shared blind spots instead."
    );
  }

  return { complements, tensions, summary: parts.join(" ") };
}

export interface CohortDimensionStat {
  letter: Dimension;
  avg: number;
  dominant: number;
  secondary: number;
  missing: number;
  rank: Rank;
}

export interface CohortReport {
  size: number;
  stats: CohortDimensionStat[];
  gaps: Dimension[];
  summary: string;
}

/** Aggregate a set of profiles into a cohort snapshot. */
export function cohortReport(members: PairMember[]): CohortReport | null {
  if (members.length < 2) return null;

  const stats: CohortDimensionStat[] = (
    ["P", "A", "E", "I"] as Dimension[]
  ).map((letter) => {
    let sum = 0;
    let dominant = 0;
    let secondary = 0;
    let missing = 0;
    for (const m of members) {
      const r = byLetter(m.results).get(letter)!;
      sum += r.average;
      if (r.rank === "Missing") missing++;
      else if (r.capital) dominant++;
      else secondary++;
    }
    const avg = Math.round((sum / members.length) * 10) / 10;
    return { letter, avg, dominant, secondary, missing, rank: rankFromAverage(avg) };
  });

  // A dimension is a cohort gap when most people are missing it.
  const gaps = stats
    .filter((s) => s.missing > members.length / 2)
    .map((s) => s.letter);

  const strongest = [...stats].sort((a, b) => b.avg - a.avg)[0];
  const nameOf = (l: Dimension) => PROFILES[l].name;

  const summary =
    `${members.length} people. The cohort's strongest collective muscle is ` +
    `${nameOf(strongest.letter)} (average ${strongest.avg.toFixed(1)}). ` +
    (gaps.length > 0
      ? `The gap is ${gaps.map(nameOf).join(" and ")}: more than half the group scored it Missing. In team projects, assign these roles deliberately instead of letting them fall to whoever complains last.`
      : `No dimension is missing for most of the group: a rare and balanced cohort. Watch for shared blind spots instead: things nobody's code covers, because everyone assumes someone else has it.`);

  return { size: members.length, stats, gaps, summary };
}
