"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { PROFILES } from "@/data/profiles";
import type { Dimension } from "@/data/questions";
import { cohortReport } from "@/lib/pair";
import {
  buildCard,
  buildSummaryText,
  courseRecommendations,
  declaredTeams,
  generateTeams,
  parseRoster,
  type MentorStudent,
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

export default function MentorPage() {
  const [raw, setRaw] = useState("");
  const [roster, setRoster] = useState<MentorStudent[] | null>(null);
  const [rejected, setRejected] = useState(0);
  const [teamsSeen, setTeamsSeen] = useState<string[]>([]);
  const [teamCount, setTeamCount] = useState(3);
  const [proposals, setProposals] = useState<Team[] | null>(null);
  const [copied, setCopied] = useState(false);

  const cards = useMemo(
    () => (roster ? roster.map(buildCard) : []),
    [roster]
  );
  const snapshot = useMemo(
    () => (roster && roster.length > 0 ? cohortReport(roster) : null),
    [roster]
  );
  const declared = useMemo(
    () => (cards.length > 0 ? declaredTeams(cards) : []),
    [cards]
  );
  const moves = useMemo(
    () => (roster ? courseRecommendations(roster) : []),
    [roster]
  );
  // Proposals only for students without a declared team.
  const ungroupedCards = useMemo(
    () => cards.filter((c) => !c.student.team),
    [cards]
  );

  const handleAnalyze = useCallback(() => {
    const { students, rejected: rej, teamsSeen: seen } = parseRoster(raw);
    setRoster(students.length > 0 ? students : null);
    setRejected(rej);
    setTeamsSeen(seen);
    const ungrouped = students.filter((s) => !s.team);
    if (ungrouped.length >= 2) {
      // Sensible default: about two students per team, capped at 3.
      const suggested = Math.max(1, Math.min(3, Math.floor(ungrouped.length / 2)));
      setTeamCount(suggested);
      setProposals(generateTeams(ungrouped.map(buildCard), suggested));
    } else {
      setProposals(null);
    }
  }, [raw]);

  const handleTeamCount = useCallback(
    (count: number) => {
      const clamped = Math.max(1, count);
      setTeamCount(clamped);
      if (!roster) return;
      const ungrouped = roster.filter((s) => !s.team);
      setProposals(
        ungrouped.length >= 2
          ? generateTeams(ungrouped.map(buildCard), clamped)
          : null
      );
    },
    [roster]
  );

  const handleCopy = useCallback(async () => {
    if (!roster || roster.length === 0) return;
    const text = buildSummaryText(roster, snapshot, declared, proposals ?? [], moves, rejected);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Copy the mentor summary:", text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [roster, snapshot, declared, proposals, moves]);

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
          names if you have them (Name, link). Group students into teams with
          headers like [Team Name]. You get the cohort snapshot, each
          student&apos;s archetype and development focus, coverage for every
          declared team, balanced proposals for everyone else, and
          course-design moves for the cohort.
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
          Result links (one per line, optional team headers)
        </label>
        <textarea
          id="mentor-input"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={10}
          placeholder={
            "[Founders]\nMarijs, https://…/results#paei=43521435214352143521\nElina, https://…/results#paei=54321543215432154321\n\n[Growth team]\nRoberts, https://…/results#paei=33445334453344533445\n\nKristaps, https://…/results#paei=55443554435544355443"
          }
          className="mt-3 w-full resize-y rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 font-mono text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
        />
        <p className="mt-2 text-xs text-white/45">
          Headers like [Team Name] group the lines below them. A blank line
          ends the group, so links after it count as having no team. Headers
          like [No team] or [Solo] also work for ungrouped students.
        </p>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleAnalyze}
          className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          Analyze cohort
        </button>
        {roster && roster.length > 0 && (
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

      {/* ==================================================== COHORT SNAPSHOT */}
      {snapshot && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-white">
            Cohort snapshot ({snapshot.size})
          </h2>
          <p className="mt-2 text-sm text-white/45">
            The group at a glance: averages, band counts, and where the room
            is thin.
          </p>
          <div className="mt-6 space-y-3">
            {snapshot.stats.map((s) => {
              const p = PROFILES[s.letter];
              const total = snapshot.size;
              return (
                <div
                  key={s.letter}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold"
                      style={{
                        backgroundColor: `${p.color}26`,
                        color: p.color,
                      }}
                    >
                      {p.letter}
                    </span>
                    <div className="flex-1">
                      <p className="font-display text-sm font-semibold text-white">
                        {p.name}
                      </p>
                      <p className="text-xs text-white/45">
                        Average {s.avg.toFixed(1)} · {s.rank}
                      </p>
                    </div>
                    <div className="text-right text-xs text-white/50">
                      <p>
                        <span className="text-emerald-300">{s.dominant}</span>{" "}
                        dominant
                      </p>
                      <p>
                        <span className="text-white/70">{s.secondary}</span>{" "}
                        secondary
                      </p>
                      <p>
                        <span className="text-white/40">{s.missing}</span>{" "}
                        missing
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full"
                      style={{
                        width: `${(s.dominant / total) * 100}%`,
                        backgroundColor: p.color,
                      }}
                    />
                    <div
                      className="h-full bg-white/35"
                      style={{ width: `${(s.secondary / total) * 100}%` }}
                    />
                    <div
                      className="h-full bg-white/12"
                      style={{ width: `${(s.missing / total) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {snapshot.gaps.length > 0 && (
            <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/80">
                Assign these on purpose
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/65">
                {snapshot.gaps
                  .map((g) => PROFILES[g].name)
                  .join(", ")}{" "}
                is missing from half or more of the group. In project teams,
                these roles will not fill themselves.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ====================================================== DECLARED TEAMS */}
      {declared.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-white">
            Declared teams ({declared.length})
          </h2>
          <p className="mt-2 text-sm text-white/45">
            Groups from your paste headers. Coverage, gaps, and watch-pairs per
            team.
          </p>
          {teamsSeen.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {teamsSeen.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60 ring-1 ring-white/10"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="mt-6 space-y-4">
            {declared.map((t) => (
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
                      key={`${m.id}-${i}`}
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

      {/* ============================================================== ROSTER */}
      {cards.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-white">
            Students ({cards.length})
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
                      <p className="text-xs text-white/45">
                        {c.archetype}
                        {c.student.team && ` · ${c.student.team}`}
                      </p>
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

      {/* ============================================================ PROPOSALS */}
      {proposals && proposals.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-white">
            Team proposals
          </h2>
          <p className="mt-2 text-sm text-white/45">
            For the{" "}
            {ungroupedCards.length} student
            {ungroupedCards.length === 1 ? "" : "s"} without a declared team.
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
              max={Math.max(1, ungroupedCards.length)}
              value={teamCount}
              onChange={(e) =>
                handleTeamCount(Number.parseInt(e.target.value, 10) || 1)
              }
              className="w-20 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-white focus:border-white/40 focus:outline-none"
            />
          </div>
          <div className="mt-6 space-y-4">
            {proposals.map((t) => (
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
                      key={`${m.id}-${i}`}
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
