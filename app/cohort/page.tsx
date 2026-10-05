"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { PROFILES } from "@/data/profiles";
import {
  type PairMember,
  type CohortReport,
  cohortReport,
  memberFromAnswers,
  parseAnswerString,
} from "@/lib/pair";

export default function CohortPage() {
  const [raw, setRaw] = useState("");
  const [members, setMembers] = useState<PairMember[]>([]);
  const [rejected, setRejected] = useState(0);
  const [ran, setRan] = useState(false);
  const [copied, setCopied] = useState(false);

  const report: CohortReport | null = useMemo(
    () => (members.length >= 2 ? cohortReport(members) : null),
    [members]
  );

  const runAnalysis = useCallback(() => {
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed: PairMember[] = [];
    let bad = 0;
    for (const line of lines) {
      const answers = parseAnswerString(line);
      if (answers) parsed.push(memberFromAnswers(answers));
      else bad++;
    }
    setMembers(parsed);
    setRejected(bad);
    setRan(true);
  }, [raw]);

  const handleCopy = useCallback(async () => {
    if (!report) return;
    const lines: string[] = [];
    lines.push(`PAEI cohort snapshot — ${report.size} people`);
    lines.push("");
    for (const s of report.stats) {
      const p = PROFILES[s.letter];
      lines.push(
        `${p.letter} ${p.name}: avg ${s.avg.toFixed(1)} — ${s.dominant} dominant, ${s.secondary} secondary, ${s.missing} missing`
      );
    }
    lines.push("");
    lines.push(report.summary);
    lines.push("");
    lines.push("— Cohort view, PAEI Test");
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
    } catch {
      window.prompt("Copy the cohort snapshot:", lines.join("\n"));
    }
    setTimeout(() => setCopied(false), 2500);
  }, [report]);

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
          PAEI
        </span>
      </header>

      <section className="py-6">
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
          Cohort view
        </h1>
        <p className="mt-3 max-w-xl text-white/55">
          For teachers and team leads. Paste everyone&apos;s result links — one
          per line — and see the group snapshot: collective strengths, the
          dimensions missing from the room, and what to assign deliberately in
          the next project. Nothing is stored.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <label
          htmlFor="cohort-input"
          className="text-xs font-semibold uppercase tracking-wider text-white/45"
        >
          Result links (one per line)
        </label>
        <textarea
          id="cohort-input"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={8}
          placeholder={"https://…/results#paei=43521435214352143521\nhttps://…/results#paei=54321543215432154321\n…"}
          className="mt-3 w-full resize-y rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 font-mono text-sm text-white placeholder:text-white/25 focus:border-white/40 focus:outline-none"
        />
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runAnalysis}
          className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          Analyze cohort
        </button>
        {report && (
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/50 hover:text-white"
          >
            {copied ? "Copied ✓" : "Copy snapshot"}
          </button>
        )}
      </div>

      {ran && members.length < 2 && (
        <p className="mt-4 text-sm text-rose-400/90">
          Need at least two valid result links to build a snapshot. Each line
          must be a complete share link (or its 20-digit code).
          {rejected > 0 && ` ${rejected} line(s) could not be read.`}
        </p>
      )}
      {ran && members.length >= 2 && rejected > 0 && (
        <p className="mt-4 text-sm text-white/40">
          {rejected} line(s) could not be read and were skipped.
        </p>
      )}

      {report && (
        <div className="mt-10 space-y-10">
          <section>
            <h2 className="font-display text-xl font-semibold text-white">
              The room at a glance
            </h2>
            <p className="mt-3 leading-relaxed text-white/65">
              {report.summary}
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">
              Per dimension
            </h2>
            <div className="mt-4 space-y-3">
              {report.stats.map((s) => {
                const p = PROFILES[s.letter];
                const total = report.size;
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
                        <p className="text-xs text-white/40">
                          Cohort average {s.avg.toFixed(1)} · {s.rank}
                        </p>
                      </div>
                      <div className="text-right text-xs text-white/50">
                        <p>
                          <span className="text-emerald-300">
                            {s.dominant}
                          </span>{" "}
                          dominant
                        </p>
                        <p>
                          <span className="text-white/70">{s.secondary}</span>{" "}
                          secondary
                        </p>
                        <p>
                          <span className="text-white/35">{s.missing}</span>{" "}
                          missing
                        </p>
                      </div>
                    </div>
                    {/* Distribution bar */}
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
          </section>

          {report.gaps.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-semibold text-white">
                Assign these on purpose
              </h2>
              <p className="mt-2 text-sm text-white/45">
                Dimensions missing from most of the group — in project teams,
                these roles will not fill themselves.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {report.gaps.map((l) => {
                  const p = PROFILES[l];
                  return (
                    <span
                      key={l}
                      className="rounded-full px-4 py-2 text-sm font-medium"
                      style={{
                        backgroundColor: `${p.color}1f`,
                        color: p.color,
                      }}
                    >
                      {p.name}
                    </span>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      <footer className="mt-auto border-t border-white/10 py-10">
        <p className="text-sm text-white/40">
          Paste links collected from &quot;Copy result link&quot; on each
          person&apos;s results page. Nothing is uploaded — the analysis runs in
          your browser.
        </p>
      </footer>
    </main>
  );
}
