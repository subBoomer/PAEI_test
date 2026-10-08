import { COMBINATIONS, PROFILES } from "@/data/profiles";
import { DIMENSION_ORDER, type Dimension } from "@/data/questions";
import {
  buildCode,
  computeResults,
  rankFromAverage,
  type DimensionResult,
} from "@/lib/scoring";
import { asGuidance, computeCompatibility, topLetter } from "@/lib/compatibility";
import { parseAnswerString } from "@/lib/pair";

// ---------------------------------------------------------------------------
// Roster parsing: "Name, link" / "Name: link" / bare links, one per line
// ---------------------------------------------------------------------------

export interface MentorStudent {
  name: string;
  answers: number[];
  results: DimensionResult[];
  code: string;
}

function extractName(line: string): string {
  const withoutLink = line
    .replace(/https?:\/\/\S*#paei=[0-5]{20}/g, "")
    .replace(/#paei=[0-5]{20}/g, "")
    .replace(/[0-5]{20}/g, "");
  const name = withoutLink
    .replace(/^[\s:;,\-–—]+|[\s:;,\-–—]+$/g, "")
    .split(/[:\-–—,]|\s{2,}/)[0]
    .trim();
  if (!name || name.length > 40) return "";
  return name;
}

export function parseRoster(raw: string): {
  students: MentorStudent[];
  rejected: number;
} {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const students: MentorStudent[] = [];
  let rejected = 0;
  for (const line of lines) {
    const answers = parseAnswerString(line);
    if (!answers) {
      rejected++;
      continue;
    }
    const results = computeResults(answers);
    students.push({
      name: extractName(line) || "Unnamed",
      answers,
      results,
      code: buildCode(results),
    });
  }
  return { students, rejected };
}

// ---------------------------------------------------------------------------
// Per-student mentor card: archetype + growth edge + development focus
// ---------------------------------------------------------------------------

export interface StudentCard {
  student: MentorStudent;
  archetype: string;
  archetypeLine: string;
  topLetter: Dimension;
  weakestLetter: Dimension;
  growthEdge: string;
  devFocus: string;
  mentorNote: string;
}

export function archetypeOf(results: DimensionResult[]): {
  name: string;
  line: string;
} {
  const doms = results.filter((r) => r.capital).map((r) => r.letter);
  const top = topLetter(results);
  if (doms.length === 0) {
    return {
      name: "Still finding their seat",
      line: `No dominant dimension yet: ${PROFILES[top].name} leans highest. Give them variety early and watch which seat they gravitate to.`,
    };
  }
  const key = DIMENSION_ORDER.filter((l) => doms.includes(l)).join("");
  const combo = COMBINATIONS.find((c) => c.letters === key);
  if (combo) return { name: combo.name, line: combo.description };
  if (doms.length === 1) {
    const p = PROFILES[doms[0]];
    return {
      name: `Pure ${p.name}`,
      line: `${p.meaning} In pure form this is nicknamed the ${p.nickname}.`,
    };
  }
  const names = key.split("").map((l) => PROFILES[l as Dimension].name);
  return {
    name: names.join(" + "),
    line: `Strong in ${names.join(", ")} together.`,
  };
}

export function buildCard(student: MentorStudent): StudentCard {
  const top = topLetter(student.results);
  const weakest = [...student.results].sort(
    (a, b) => a.average - b.average
  )[0].letter;
  const arch = archetypeOf(student.results);
  return {
    student,
    archetype: arch.name,
    archetypeLine: arch.line,
    topLetter: top,
    weakestLetter: weakest,
    growthEdge: PROFILES[weakest].why,
    devFocus: `Development focus: ${PROFILES[weakest].name} - start with "${PROFILES[weakest].improve[0]}"`,
    mentorNote: asGuidance(PROFILES[top].work.delegate),
  };
}

// ---------------------------------------------------------------------------
// Team generator: greedy coverage-first placement, friction computed after
// ---------------------------------------------------------------------------

export interface TeamMember {
  name: string;
  code: string;
  archetype: string;
}

export interface Team {
  label: string;
  members: TeamMember[];
  coverage: Dimension[];
  gaps: Dimension[];
  friction: string[];
  note: string;
}

function recomputeTeam(team: Team, fullCards: StudentCard[]): void {
  const coverage: Dimension[] = [];
  for (const m of team.members) {
    const card = fullCards.find((c) => c.student.name === m.name);
    if (!card) continue;
    for (const r of card.student.results) {
      if (r.capital && !coverage.includes(r.letter)) coverage.push(r.letter);
    }
  }
  team.coverage = DIMENSION_ORDER.filter((l) => coverage.includes(l));
  team.gaps = DIMENSION_ORDER.filter((l) => !coverage.includes(l));
  team.friction = [];
  for (let i = 0; i < team.members.length; i++) {
    for (let j = i + 1; j < team.members.length; j++) {
      const a = fullCards.find((c) => c.student.name === team.members[i].name);
      const b = fullCards.find((c) => c.student.name === team.members[j].name);
      if (!a || !b) continue;
      const rep = computeCompatibility(
        a.student.results,
        b.student.results
      );
      if (rep.tier === "Watch out" || rep.tier === "High friction") {
        team.friction.push(
          `${team.members[i].name} & ${team.members[j].name}: ${rep.tier} - ${rep.watchFor}`
        );
      }
    }
  }
  team.note =
    team.gaps.length === 0
      ? "Every dimension has a natural owner - assign roles explicitly to avoid overlap."
      : `No dominant ${joinNames(
          team.gaps.map((g) => PROFILES[g].name)
        )} here - mentor check-in recommended.`;
}

/** "A" / "A and B" / "A, B, and C" */
function joinNames(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function generateTeams(
  cards: StudentCard[],
  teamCount: number
): Team[] {
  const count = Math.max(1, Math.min(teamCount, cards.length));
  const teams: Team[] = Array.from({ length: count }, (_, i) => ({
    label: `Team ${i + 1}`,
    members: [],
    coverage: [],
    gaps: [],
    friction: [],
    note: "",
  }));

  // Scarcity first: students whose dominant dimensions are rarest get placed
  // first, so scarce capabilities do not all land in one team.
  const domCount = new Map<Dimension, number>();
  for (const l of DIMENSION_ORDER) domCount.set(l, 0);
  for (const c of cards) {
    for (const r of c.student.results) {
      if (r.capital) domCount.set(r.letter, (domCount.get(r.letter) ?? 0) + 1);
    }
  }
  const scarcityOf = (c: StudentCard): number => {
    const doms = c.student.results.filter((r) => r.capital);
    // No dominant dimension: flexible, place last as fill.
    if (doms.length === 0) return -1;
    // Rarer dominant capabilities (lower cohort count) placed first.
    return Math.min(...doms.map((r) => domCount.get(r.letter) ?? 99));
  };
  const sorted = [...cards].sort((a, b) => {
    const s = scarcityOf(b) - scarcityOf(a);
    if (s !== 0) return s;
    const da = a.student.results.filter((r) => r.capital).length;
    const db = b.student.results.filter((r) => r.capital).length;
    return db - da;
  });

  const target = Math.ceil(cards.length / count);
  for (const card of sorted) {
    let best = teams[0];
    let bestScore = -Infinity;
    for (const t of teams) {
      const newCoverage = card.student.results.filter(
        (r) => r.capital && !t.coverage.includes(r.letter)
      ).length;
      const overfill = Math.max(0, t.members.length + 1 - target);
      const score = newCoverage * 3 - overfill * 5;
      if (score > bestScore) {
        bestScore = score;
        best = t;
      }
    }
    best.members.push({
      name: card.student.name,
      code: card.student.code,
      archetype: card.archetype,
    });
    recomputeTeam(best, cards);
  }
  return teams;
}

// ---------------------------------------------------------------------------
// Cohort -> course-design moves for the two weakest dimensions
// ---------------------------------------------------------------------------

export const COURSE_MOVES: Record<Dimension, string[]> = {
  P: [
    "Front-load visible deliverables: weekly ship demos instead of long silent build periods.",
    "Pair students on concrete tasks rather than open-ended briefs - momentum beats polish early.",
  ],
  A: [
    "Bring the structure from outside: planning templates, milestone checklists, and role charters at project kickoff.",
    "Assign a rotating process owner per team so planning becomes a habit, not a lecture.",
  ],
  E: [
    "Open each project with a problem-framing workshop, not a solution brief.",
    "Run a midpoint pivot review - reward one small, real experiment per team per sprint.",
  ],
  I: [
    "Start sessions with a check-in round and assign a rotating culture role per team.",
    "Use structured peer feedback so tensions surface early instead of festering.",
  ],
};

export interface CourseMove {
  dimension: Dimension;
  avg: number;
  rank: string;
  moves: string[];
}

export function courseRecommendations(
  members: MentorStudent[]
): CourseMove[] {
  if (members.length === 0) return [];
  const stats = DIMENSION_ORDER.map((letter) => {
    let sum = 0;
    for (const m of members) {
      sum += m.results.find((r) => r.letter === letter)!.average;
    }
    return { letter, avg: Math.round((sum / members.length) * 10) / 10 };
  })
    // Only prescribe moves where the cohort is actually weak.
    .filter((s) => rankFromAverage(s.avg) !== "Very Dominant" && rankFromAverage(s.avg) !== "Dominant")
    .sort((a, b) => a.avg - b.avg);
  return stats.slice(0, 2).map((s) => ({
    dimension: s.letter,
    avg: s.avg,
    rank: rankFromAverage(s.avg),
    moves: COURSE_MOVES[s.letter],
  }));
}
