import { COMBINATIONS, PROFILES } from "@/data/profiles";
import { DIMENSION_ORDER, type Dimension } from "@/data/questions";
import {
  buildCode,
  computeResults,
  rankFromAverage,
  type DimensionResult,
} from "@/lib/scoring";
import { asGuidance, computeCompatibility, topLetter } from "@/lib/compatibility";
import { parseAnswerString, type CohortReport } from "@/lib/pair";

// ---------------------------------------------------------------------------
// Roster parsing: "Name, link" / "Name: link" / bare links, one per line
// ---------------------------------------------------------------------------

export interface MentorStudent {
  id: number;
  name: string;
  /** Declared team from paste headers ([Team Name] or "Team: Name"). */
  team: string | null;
  answers: number[];
  results: DimensionResult[];
  code: string;
}

function extractName(line: string): string {
  const withoutLink = line
    .replace(/https?:\/\/\S*#paei=[0-5]{20}/g, "")
    .replace(/#paei=[0-5]{20}/g, "")
    .replace(/[0-5]{20}/g, "")
    .replace(/[?&#]n=[^&\s]+/g, "");
  const name = withoutLink
    .replace(/^[\s:;,\-–—]+|[\s:;,\-–—]+$/g, "")
    .split(/[:\-–—,]|\s{2,}/)[0]
    .trim();
  if (name && name.length <= 40) return name;
  // Fallback: name carried inside the link hash (#paei=...&n=Marijs).
  const m = /[?&#]n=([^&\s]+)/.exec(line);
  if (m) {
    try {
      const decoded = decodeURIComponent(m[1])
        .trim()
        .replace(/[,;:.]+$/, "");
      if (decoded && decoded.length <= 40) return decoded;
    } catch {
      /* malformed encoding - ignore */
    }
  }
  return "";
}

/** Lines like "[Founders]" or "Team: Founders" set the current team context. */
const TEAM_HEADER = /^(?:\[([^\]]+)\]|Team:\s*(.+))$/i;

/** One share link or bare code: full URL, bare hash, or 20 bare digits. */
const LINK_TOKENS = /(?:https?:\/\/\S+|#paei=[0-5]{20}(?:&n=[^&\s]+)?)|[0-5]{20}/g;

/** Headers that mean "explicitly no team" instead of creating a team. */
const NO_TEAM = /^(?:no\s+team(?:\s+yet)?|solo|ungrouped|looking\s+for\s+team)$/i;

export function parseRoster(raw: string): {
  students: MentorStudent[];
  rejected: number;
  teamsSeen: string[];
} {
  const students: MentorStudent[] = [];
  const teamsSeen: string[] = [];
  let rejected = 0;
  let currentTeam: string | null = null;
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    // A blank line ends the current team block: following links are ungrouped.
    if (!line) {
      currentTeam = null;
      continue;
    }
    const header = TEAM_HEADER.exec(line);
    if (header) {
      const t = (header[1] ?? header[2]).trim().slice(0, 40);
      currentTeam = !t || NO_TEAM.test(t) ? null : t;
      if (currentTeam && !teamsSeen.includes(currentTeam)) {
        teamsSeen.push(currentTeam);
      }
      continue;
    }
    // Bare sentinel labels like "No team yet:" also mean explicitly ungrouped.
    if (NO_TEAM.test(line.replace(/:$/, ""))) {
      currentTeam = null;
      continue;
    }
    // Easier paste: pull every link out of the line, not just the first —
    // chat dumps often carry several links on one line. Each link's name is
    // the text segment directly before it ("Marijs ... and Elina ...").
    const matches = [...line.matchAll(LINK_TOKENS)];
    if (matches.length === 0) {
      rejected++;
      continue;
    }
    let prevEnd = 0;
    for (const m of matches) {
      const start = m.index ?? 0;
      const segment = line.slice(prevEnd, start);
      prevEnd = start + m[0].length;
      const answers = parseAnswerString(m[0]);
      if (!answers) {
        rejected++;
        continue;
      }
      const name =
        extractName(segment.replace(/^\s*(?:and|&|or)\s+/i, "")) ||
        extractName(m[0]);
      const results = computeResults(answers);
      students.push({
        id: students.length,
        name: name || "Unnamed",
        team: currentTeam,
        answers,
        results,
        code: buildCode(results),
      });
    }
  }
  return { students, rejected, teamsSeen };
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
  const hasDominant = student.results.some((r) => r.capital);
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
    // Without a dominant letter there is no honest "lead through X" guidance:
    // coaching them as if they leaned somewhere would contradict the card.
    mentorNote: hasDominant
      ? asGuidance(PROFILES[top].work.delegate)
      : "No default seat yet: rotate their tasks across execution, structure, ideas, and people for a semester, then watch which one they grow toward.",
  };
}

// ---------------------------------------------------------------------------
// Team generator: greedy coverage-first placement, friction computed after
// ---------------------------------------------------------------------------

export interface TeamMember {
  id: number;
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
    const card = fullCards.find((c) => c.student.id === m.id);
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
      const a = fullCards.find((c) => c.student.id === team.members[i].id);
      const b = fullCards.find((c) => c.student.id === team.members[j].id);
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
      id: card.student.id,
      name: card.student.name,
      code: card.student.code,
      archetype: card.archetype,
    });
    recomputeTeam(best, cards);
  }
  return teams;
}

/**
 * Teams declared in the paste ([Team Name] headers), with the same
 * coverage / gaps / friction stats as generated proposals.
 */
export function declaredTeams(cards: StudentCard[]): Team[] {
  const byTeam = new Map<string, StudentCard[]>();
  for (const c of cards) {
    if (!c.student.team) continue;
    const list = byTeam.get(c.student.team) ?? [];
    list.push(c);
    byTeam.set(c.student.team, list);
  }
  const teams: Team[] = [];
  for (const [label, group] of byTeam) {
    const team: Team = {
      label,
      members: [],
      coverage: [],
      gaps: [],
      friction: [],
      note: "",
    };
    for (const c of group) {
      team.members.push({
        id: c.student.id,
        name: c.student.name,
        code: c.student.code,
        archetype: c.archetype,
      });
    }
    recomputeTeam(team, cards);
    teams.push(team);
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

/**
 * Plain-text mentor summary: cohort averages, declared teams, per-student
 * cards, proposals, and course moves. Built for pasting into notes, chat,
 * or an AI agent.
 */
export function buildSummaryText(
  roster: MentorStudent[],
  snapshot: CohortReport | null,
  declared: Team[],
  proposals: Team[],
  moves: CourseMove[],
  rejected = 0
): string {
  const lines: string[] = [];
  lines.push(`Mentor summary - PAEI cohort (${roster.length} people)`);
  if (rejected > 0) {
    lines.push(
      `${rejected} item(s) could not be read and were skipped - coverage is partial.`
    );
  }
  lines.push("");
  if (snapshot) {
    lines.push("Cohort averages:");
    for (const s of snapshot.stats) {
      lines.push(
        `  ${PROFILES[s.letter].name}: ${s.avg.toFixed(1)} (${s.rank}) - ${s.dominant} dominant, ${s.secondary} secondary, ${s.missing} missing`
      );
    }
    if (snapshot.gaps.length > 0) {
      lines.push(
        `Gaps: ${snapshot.gaps.map((g) => PROFILES[g].name).join(", ")} - half or more of the group is missing this dimension.`
      );
    }
    lines.push("");
  }
  if (declared.length > 0) {
    lines.push("Declared teams:");
    for (const t of declared) {
      lines.push(
        `${t.label}: ${t.members.map((m) => `${m.name} (${m.code})`).join(", ")}`
      );
      lines.push(
        `  Covered: ${t.coverage.map((l) => PROFILES[l].letter).join(", ") || "none"} | Gaps: ${t.gaps.map((l) => PROFILES[l].name).join(", ") || "none"}`
      );
      for (const f of t.friction) lines.push(`  Watch: ${f}`);
      lines.push(`  ${t.note}`);
    }
    lines.push("");
  }
  lines.push("Students:");
  for (const c of roster.map(buildCard)) {
    lines.push(`${c.student.name} - ${c.student.code} (${c.archetype})`);
    lines.push(`  Growth edge: ${PROFILES[c.weakestLetter].name}`);
    lines.push(`  ${c.devFocus}`);
    lines.push(`  Mentor note: ${c.mentorNote}`);
    lines.push("");
  }
  if (proposals.length > 0) {
    lines.push("Proposed teams (for students without a declared team):");
    for (const t of proposals) {
      lines.push(
        `${t.label}: ${t.members.map((m) => `${m.name} (${m.code})`).join(", ")}`
      );
      lines.push(
        `  Covered: ${t.coverage.map((l) => PROFILES[l].letter).join(", ") || "none"} | Gaps: ${t.gaps.map((l) => PROFILES[l].name).join(", ") || "none"}`
      );
      for (const f of t.friction) lines.push(`  Watch: ${f}`);
    }
    lines.push("");
  }
  if (moves.length > 0) {
    lines.push("Course design moves:");
    for (const m of moves) {
      lines.push(
        `- ${PROFILES[m.dimension].name} (avg ${m.avg.toFixed(1)}, ${m.rank}):`
      );
      for (const move of m.moves) lines.push(`  * ${move}`);
    }
    lines.push("");
  }
  lines.push(
    "PAEI shows natural strengths, not ceilings. Development focus, not gatekeeping."
  );
  lines.push("- Mentor view, PAEI app - Future Leaders - Leadership I");
  return lines.join("\n");
}
