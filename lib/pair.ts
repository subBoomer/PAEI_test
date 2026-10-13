import { PROFILES } from "@/data/profiles";
import { DIMENSION_ORDER, type Dimension } from "@/data/questions";
import { computeCompatibility, type Tier } from "@/lib/compatibility";
import {
  type DimensionResult,
  type Rank,
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
  /** Display name carried in a share link (&n=), or "You" for a saved result. */
  name?: string;
  results: DimensionResult[];
  code: string;
}

const byLetter = (rs: DimensionResult[]) =>
  new Map(rs.map((r) => [r.letter, r]));

/** "Marijs" / "Person 2" when no name is known. */
export function memberLabel(m: PairMember, index: number): string {
  return m.name && m.name.trim() ? m.name.trim() : `Person ${index + 1}`;
}

export interface GroupRole {
  letter: Dimension;
  /** Members who are naturally strong (dominant) on this dimension. */
  owners: number[];
  /** Members who score Missing here. */
  missing: number[];
  /** Member with the highest average on this dimension. */
  top: number;
  topAvg: number;
}

export interface GroupFriction {
  a: number;
  b: number;
  tier: Tier;
  watchFor: string;
}

export interface GroupInsight {
  size: number;
  roles: GroupRole[];
  /** Dimensions nobody is naturally strong in. */
  gaps: Dimension[];
  frictions: GroupFriction[];
  summary: string;
}

/**
 * Compare two or more profiles: who owns each seat, which seats nobody
 * covers, and where friction runs between any pair. The same read serves a
 * co-founder check, a project team, or a whole group.
 */
export function groupInsights(members: PairMember[]): GroupInsight | null {
  if (members.length < 2) return null;

  const roles: GroupRole[] = DIMENSION_ORDER.map((letter) => {
    const owners: number[] = [];
    const missing: number[] = [];
    let top = 0;
    let topAvg = -1;
    members.forEach((m, i) => {
      const r = byLetter(m.results).get(letter)!;
      if (r.capital) owners.push(i);
      if (r.rank === "Missing") missing.push(i);
      if (r.average > topAvg) {
        topAvg = r.average;
        top = i;
      }
    });
    return { letter, owners, missing, top, topAvg };
  });

  // A seat nobody is naturally strong in: a gap for this group.
  const gaps = roles.filter((r) => r.owners.length === 0).map((r) => r.letter);

  // Friction between any pair (same engine the mentor team view uses).
  const frictions: GroupFriction[] = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const rep = computeCompatibility(members[i].results, members[j].results);
      if (rep.tier === "Watch out" || rep.tier === "High friction") {
        frictions.push({ a: i, b: j, tier: rep.tier, watchFor: rep.watchFor });
      }
    }
  }
  // High friction first, then Watch out.
  frictions.sort((x, y) =>
    x.tier === y.tier ? 0 : x.tier === "High friction" ? -1 : 1
  );

  const codes = members
    .map((m, i) => `${memberLabel(m, i)} (${m.code})`)
    .join(", ");
  const parts: string[] = [];
  parts.push(`Reading ${members.length} people: ${codes}.`);
  if (gaps.length === 0) {
    parts.push(
      "Between you, all four seats are covered. Name who owns each one so nobody assumes someone else has it."
    );
  } else if (gaps.length === 1) {
    parts.push(
      `Nobody naturally covers ${PROFILES[gaps[0]].name}: that seat lands on whoever steps up, or quietly goes undone.`
    );
  } else {
    parts.push(
      `Nobody naturally covers ${gaps
        .map((g) => PROFILES[g].name)
        .join(" or ")}: decide who takes those seats before they go unowned.`
    );
  }
  if (frictions.length > 0) {
    const f = frictions[0];
    parts.push(
      `The sharpest friction is between ${memberLabel(
        members[f.a],
        f.a
      )} and ${memberLabel(members[f.b], f.b)} (${f.tier}).`
    );
  } else {
    parts.push(
      "No strong crossed friction between any pair: the risk here is shared blind spots, not clashes."
    );
  }

  return {
    size: members.length,
    roles,
    gaps,
    frictions,
    summary: parts.join(" "),
  };
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
