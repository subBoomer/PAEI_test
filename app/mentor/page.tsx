"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { PROFILES } from "@/data/profiles";
import type { Dimension } from "@/data/questions";
import {
  buildCard,
  courseRecommendations,
  generateTeams,
  parseRoster,
  type MentorStudent,
  type StudentCard,
  type Team,
} from "@/lib/mentor";

function CodeLetters({ code, size }: { code: string; size: string }) {
  return (
    <span
      className="font-display font-bold leading-none"
      style={{ fontSize: size }}
    >
      {code.split("").map((ch, i) => {
        const dim = Object.values(PROFILES).find(
          (p) => p.letter.toLowerCase() === ch.toLowerCase()
        );
        return (
          <span
            key={i}
            style={{
              color: dim ? dim.color : "#fff",
              opacity: ch === ch.toLowerCase() ? 0.55 : 1,
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}

function CoverageChips({ dims }: { dims: Dimension[] }) {
  if (dims.length === 0) return <span className="text-xs text-white/40">none</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {dims.map((d) => {
        const p = PROFILES[d];
        return (
          <span
            key={d}
            className="rounded-lg px-2 py-0.5 font-display text-xs font-bold"
            style={{ backgroundColor: `${p.color}26`, color: p.color }}
          >
            {p.letter}
          </span>
        );
      })}
    </span>
  );
}

function buildSummaryText(
  cards: StudentCard[],
  teams: Team[] | null,
  moves: ReturnType<typeof courseRecommendations>
): string {
  const lines: string[] = [];
  lines.push(`Mentor summary - PAEI cohort (${cards.length} people)`);
  lines.push("");
  for (const c of cards) {
    lines.push(
      `${c.student.name} - ${c.student.code} (${c.archetype})`
    );
    lines.push(`  Growth edge: ${PROFILES[c.weakestLetter].name}`);
    lines.push(`  ${c.devFocus}`);
    lines.push(`  Mentor note: ${c.mentorNote}`);
    lines.push("");
  }
  if (teams) {
    lines.push("Teams:");
    for (const t of teams) {
      lines.push(
        `${t.label}: ${t.members.map((m) => `${m.name} (${m.code})`).join(", ")}`
      );
      lines.push(
        `  Coverage: ${t.coverage.map((l) => PROFILES[l].letter).join(", ") || "none"} | Gaps: ${t.gaps.map((l) => PROFILES[l].name).join(", ") || "none"}`
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

export default function MentorPage() {
  const [raw, setRaw] = useState("");
  const [roster, setRoster] = useState<MentorStudent[] | null>(null);
  const [rejected, setRejected] = useState(0);
  const [teamCount, setTeamCount] = useState(3);
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [copied, setCopied] = useState(false);

  const cards = useMemo(
    () => (roster ? roster.map(buildCard) : []),
    [roster]
  );
  const moves = useMemo(
    () => (roster ? courseRecommendations(roster) : []),
    [roster]
  );

  const runAnalysis = useCallback(
    (students: MentorStudent[], count: number) => {
      setTeams(
        students.length >= 2
          ? generateTeams(students.map(buildCard), count)
          : null
      );
    },
    []
  );

  const handleAnalyze = useCallback(() => {
    const { students, rejected: rej } = parseRoster(raw);
    setRoster(students.length > 0 ? students : null);
    setRejected(rej);
    runAnalysis(students, teamCount);
  }, [raw, teamCount, runAnalysis]);

  const handleTeamCount = useCallback(
    (count: number) => {
      const clamped = Math.max(1, count);
      setTeamCount(clamped);
      if (roster) runAnalysis(roster, clamped);
    },
    [roster, runAnalysis]
  );

  const handleCopy = useCallback(async () => {
    if (cards.length === 0) return;
    const text = buildSummaryText(cards, teams, moves);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Copy the mentor summary:", text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [cards, teams, moves]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <Link
          href="/"
          className="text-sm text-white/50 transition-colors hover:text-white"
        >
          ← Home
        </Link>
        <span className="font-display text-sm font-medium text-white/60">
          Mentor view
        </span>
      </header>

      <section className="py-6">
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
          Mentor view
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/55">
          Paste the result links students share with you, one per line, with
          names if you have them (Name, link). You get each student&apos;s
          archetype, growth edge, and development focus, plus balanced team
          proposals and course-design moves for the cohort.
        </p>
        <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-white/60">
          <span className="font-medium text-white/80">
            How to read this:
          </span>{" "}
          PAEI shows natural strengths, not ceilings. Use it to set people up
          to succeed, not to sort them. A missing dimension is a development
          focus and a hiring hint, never a verdict on the student. Nothing is
          uploaded: the analysis runs in your browser.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <label
          htmlFor="mentor-input"
          className="text-xs font-semibold uppercase tracking-wider text-white/45"
        >
          Result links (one per line)
        </label>
        <textarea
          id="mentor-input"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={8}
          placeholder={
            "Marijs, https://…/results#paei=43521435214352143521\nElina, https://…/results#paei=54321543215432154321\n…"
          }
          className="mt-3 w-full resize-y rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 font-mono text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
        />
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleAnalyze}
          className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          Analyze cohort
        </button>
        {cards.length > 0 && (
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/50 hover:text-white"
          >
            {copied ? "Copied ✓" : "Copy mentor summary"}
          </button>
        )}
      </div>

      {roster && roster.length === 0 && (
        <p className="mt-4 text-sm text-rose-400/90">
          No valid result links found. Paste complete share links (or their
          20-digit codes).
          {rejected > 0 && ` ${rejected} line(s) could not be read.`}
        </p>
      )}
      {roster && roster.length > 0 && rejected > 0 && (
        <p className="mt-4 text-sm text-white/45">
          {rejected} line(s) could not be read and were skipped.
        </p>
      )}

      {/* ============================================================= ROSTER */}
      {cards.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-white">
            Your cohort ({cards.length})
          </h2>
          <p className="mt-2 text-sm text-white/45">
            Archetype, growth edge, and development focus per student.
          </p>
          <div className="mt-6 space-y-4">
            {cards.map((c, i) => (
              <div
                key={`${c.student.name}-${i}`}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <CodeLetters
                      code={c.student.code}
                      size="1.75rem"
                    />
                    <div>
                      <h3 className="font-display text-lg font-semibold text-white">
                        {c.student.name}
                      </h3>
                      <p className="text-xs text-white/45">{c.archetype}</p>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-white/60">
                  {c.archetypeLine}
                </p>
                <div className="mt-4 space-y-2">
                  <p className="text-sm leading-relaxed text-white/65">
                    <span className="font-medium text-white/80">
                      Growth edge:{" "}
                    </span>
                    {PROFILES[c.weakestLetter].name} -{" "}
                    {c.growthEdge}
                  </p>
                  <p className="text-sm leading-relaxed text-white/65">
                    <span className="font-medium text-white/80">
                      Development focus:{" "}
                    </span>
                    {c.devFocus.replace(/^Development focus: /, "")}
                  </p>
                  <p className="text-sm leading-relaxed text-white/65">
                    <span className="font-medium text-white/80">
                      Mentor note:{" "}
                    </span>
                    {c.mentorNote}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================== TEAMS */}
      {teams && teams.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-white">
            Balanced team proposals
          </h2>
          <p className="mt-2 text-sm text-white/45">
            Coverage-first placement: scarce capabilities spread across teams,
            friction pairs named so you can plan check-ins.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-sm text-white/60" htmlFor="team-count">
              Teams:
            </label>
            <input
              id="team-count"
              type="number"
              min={1}
              max={cards.length}
              value={teamCount}
              onChange={(e) =>
                handleTeamCount(Number.parseInt(e.target.value, 10) || 1)
              }
              className="w-20 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-white focus:border-white/40 focus:outline-none"
            />
          </div>
          <div className="mt-6 space-y-4">
            {teams.map((t) => (
              <div
                key={t.label}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold text-white">
                    {t.label}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-white/50">
                    <span className="flex items-center gap-1.5">
                      Covered <CoverageChips dims={t.coverage} />
                    </span>
                    <span className="flex items-center gap-1.5">
                      Gaps{" "}
                      {t.gaps.length === 0 ? (
                        <span className="text-emerald-300">none</span>
                      ) : (
                        <CoverageChips dims={t.gaps} />
                      )}
                    </span>
                  </div>
                </div>
                <ul className="mt-4 space-y-2">
                  {t.members.map((m, i) => (
                    <li
                      key={`${m.name}-${i}`}
                      className="flex flex-wrap items-center gap-3 text-sm"
                    >
                      <span className="font-medium text-white/85">
                        {m.name}
                      </span>
                      <CodeLetters code={m.code} size="1.1rem" />
                      <span className="text-xs text-white/45">
                        {m.archetype}
                      </span>
                    </li>
                  ))}
                </ul>
                {t.friction.length > 0 && (
                  <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/80">
                      Watch pairs
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {t.friction.map((f, i) => (
                        <li
                          key={i}
                          className="text-sm leading-relaxed text-white/65"
                        >
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="mt-4 text-sm leading-relaxed text-white/60">
                  {t.note}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ==================================================== COURSE MOVES */}
      {roster && roster.length > 0 && moves.length === 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-white">
            Course design moves
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            No weak dimensions to intervene on: this cohort is strong across
            the board. Watch for shared blind spots instead - things nobody&apos;s
            code covers, because everyone assumes someone else has it.
          </p>
        </section>
      )}
      {moves.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-white">
            Course design moves
          </h2>
          <p className="mt-2 text-sm text-white/45">
            The two dimensions this cohort is weakest on, with process
            adjustments for the coming weeks.
          </p>
          <div className="mt-6 space-y-4">
            {moves.map((m) => {
              const p = PROFILES[m.dimension];
              return (
                <div
                  key={m.dimension}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl font-display text-lg font-bold"
                      style={{
                        backgroundColor: `${p.color}26`,
                        color: p.color,
                      }}
                    >
                      {p.letter}
                    </span>
                    <div>
                      <h3 className="font-display text-base font-semibold text-white">
                        {p.name}
                      </h3>
                      <p className="text-xs text-white/45">
                        Cohort average {m.avg.toFixed(1)} - {m.rank}
                      </p>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {m.moves.map((move, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-sm leading-relaxed text-white/65"
                      >
                        <span
                          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-display text-xs font-bold"
                          style={{
                            backgroundColor: `${p.color}26`,
                            color: p.color,
                          }}
                        >
                          {i + 1}
                        </span>
                        {move}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <footer className="mt-auto border-t border-white/10 py-8">
        <p className="text-xs text-white/45">
          Nothing is stored or sent anywhere: the analysis runs in your browser.
          Mentor view, PAEI app - Future Leaders - Leadership I.
        </p>
      </footer>
    </main>
  );
}
