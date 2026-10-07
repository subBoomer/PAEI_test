"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PROFILES } from "@/data/profiles";
import {
  type PairMember,
  memberFromAnswers,
  pairInsights,
  parseAnswerString,
} from "@/lib/pair";

function CodeChip({ code }: { code: string }) {
  return (
    <span className="font-display text-3xl font-bold tracking-tight">
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

export default function PairPage() {
  const [inputA, setInputA] = useState("");
  const [inputB, setInputB] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [memberA, setMemberA] = useState<PairMember | null>(null);
  const [memberB, setMemberB] = useState<PairMember | null>(null);
  const [copied, setCopied] = useState(false);

  // Support shared pair links: /pair?a=43521...&b=43521...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const a = params.get("a") ?? "";
    const b = params.get("b") ?? "";
    if (a && b) {
      setInputA(a);
      setInputB(b);
      const pa = parseAnswerString(a);
      const pb = parseAnswerString(b);
      if (pa && pb) {
        setMemberA(memberFromAnswers(pa));
        setMemberB(memberFromAnswers(pb));
        setError(null);
      }
    }
  }, []);

  const insight = useMemo(() => {
    if (!memberA || !memberB) return null;
    return pairInsights(memberA, memberB);
  }, [memberA, memberB]);

  const runCompare = useCallback(() => {
    const pa = parseAnswerString(inputA);
    const pb = parseAnswerString(inputB);
    if (!pa || !pb) {
      setError(
        "Both fields need a complete result — paste the full share link, or the 20-digit code from one."
      );
      setMemberA(null);
      setMemberB(null);
      return;
    }
    setError(null);
    setMemberA(memberFromAnswers(pa));
    setMemberB(memberFromAnswers(pb));
  }, [inputA, inputB]);

  const handleCopyLink = useCallback(async () => {
    const pa = parseAnswerString(inputA);
    const pb = parseAnswerString(inputB);
    if (!pa || !pb) return;
    const url = `${window.location.origin}/pair?a=${pa.join("")}&b=${pb.join("")}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Copy this pair link:", url);
    }
    setTimeout(() => setCopied(false), 2500);
  }, [inputA, inputB]);

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
          Co-founder pair check
        </h1>
        <p className="mt-3 max-w-xl text-white/55">
          Paste two people&apos;s result links — yours and your co-founder&apos;s.
          You will see where you cover each other&apos;s gaps and which tensions
          run between you. Nothing is stored; the comparison lives in the link.
        </p>
      </section>

      {/* Inputs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { label: "Person A", value: inputA, set: setInputA, ph: "Paste A's result link…" },
          { label: "Person B", value: inputB, set: setInputB, ph: "Paste B's result link…" },
        ].map((f) => (
          <div
            key={f.label}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <label className="text-xs font-semibold uppercase tracking-wider text-white/45">
              {f.label}
            </label>
            <input
              type="text"
              inputMode="url"
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              placeholder={f.ph}
              className="mt-3 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
            />
          </div>
        ))}
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runCompare}
          className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          Compare
        </button>
        {memberA && memberB && (
          <button
            type="button"
            onClick={handleCopyLink}
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/50 hover:text-white"
          >
            {copied ? "Copied ✓" : "Copy pair link"}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm text-rose-400/90">{error}</p>
      )}

      {/* Results */}
      {memberA && memberB && insight && (
        <div className="mt-10 space-y-10">
          {/* Codes side by side */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[memberA, memberB].map((m, i) => (
              <div
                key={i}
                className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  {i === 0 ? "Person A" : "Person B"}
                </p>
                <div className="mt-3">
                  <CodeChip code={m.code} />
                </div>
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  {m.results.map((r) => {
                    const p = PROFILES[r.letter];
                    return (
                      <span
                        key={r.letter}
                        className="rounded-full px-2 py-0.5 text-[11px]"
                        style={{
                          backgroundColor: `${p.color}1f`,
                          color: p.color,
                        }}
                      >
                        {r.average.toFixed(1)}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          {/* Summary */}
          <section>
            <h2 className="font-display text-xl font-semibold text-white">
              The read
            </h2>
            <p className="mt-3 leading-relaxed text-white/65">
              {insight.summary}
            </p>
          </section>

          {/* Complements */}
          {insight.complements.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-semibold text-white">
                Where you cover each other
              </h2>
              <div className="mt-4 space-y-3">
                {insight.complements.map((c) => {
                  const p = PROFILES[c.letter];
                  return (
                    <div
                      key={c.letter}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold"
                        style={{
                          backgroundColor: `${p.color}26`,
                          color: p.color,
                        }}
                      >
                        {p.letter}
                      </span>
                      <div>
                        <p className="font-display text-sm font-semibold text-white">
                          {p.name} — led by {c.strong}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-white/55">
                          {c.note}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Tensions */}
          {insight.tensions.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-semibold text-white">
                Tensions between you
              </h2>
              <p className="mt-2 text-sm text-white/45">
                Not flaws — just the axes where you will pull in opposite
                directions. Naming them early prevents most founding-team
                blow-ups.
              </p>
              <div className="mt-4 space-y-3">
                {insight.tensions.map((t) => {
                  const pa = PROFILES[t.a];
                  const pb = PROFILES[t.b];
                  return (
                    <div
                      key={`${t.a}-${t.b}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-lg px-2 py-0.5 font-display text-sm font-bold"
                          style={{
                            backgroundColor: `${pa.color}26`,
                            color: pa.color,
                          }}
                        >
                          {pa.letter}
                        </span>
                        <span className="text-xs text-white/45">vs</span>
                        <span
                          className="rounded-lg px-2 py-0.5 font-display text-sm font-bold"
                          style={{
                            backgroundColor: `${pb.color}26`,
                            color: pb.color,
                          }}
                        >
                          {pb.letter}
                        </span>
                        <span className="ml-1 font-display text-base font-semibold text-white">
                          {t.title}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-white/55">
                        {t.note}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      <footer className="mt-auto border-t border-white/10 py-10">
        <p className="text-sm text-white/40">
          Both people&apos;s data stays inside the shared link — nothing is sent
          to a server.
        </p>
      </footer>
    </main>
  );
}
