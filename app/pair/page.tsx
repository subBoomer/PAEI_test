"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Attribution from "@/components/Attribution";
import { PROFILES } from "@/data/profiles";
import { loadCompleted, loadName, nameFromHash } from "@/lib/answers";
import { tierTone } from "@/lib/compatibility";
import {
  groupInsights,
  memberLabel,
  parseAnswerString,
  type PairMember,
} from "@/lib/pair";
import { buildCode, computeResults } from "@/lib/scoring";

/** Most people a non-technical user will realistically compare in one pass. */
const MAX_PEOPLE = 8;

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

interface Slot {
  id: number;
  /** Pasted share link or bare code. Ignored when the slot is "you". */
  value: string;
  /** True when this slot holds the tester's own saved result. */
  mine: boolean;
  /** Name carried in a group share link (bare codes have no &n=). */
  name?: string;
}

interface Compared extends PairMember {
  answers: number[];
  mine: boolean;
}

export default function PairPage() {
  const idRef = useRef(3);
  const [slots, setSlots] = useState<Slot[]>([
    { id: 1, value: "", mine: false },
    { id: 2, value: "", mine: false },
  ]);
  const [myResult, setMyResult] = useState<{
    answers: number[];
    code: string;
    name: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<Compared[] | null>(null);
  const [copied, setCopied] = useState(false);

  const myAdded = slots.some((s) => s.mine);

  // Load the tester's own saved result, plus any shared comparison link.
  useEffect(() => {
    const completed = loadCompleted();
    if (completed) {
      const results = computeResults(completed);
      setMyResult({
        answers: completed,
        code: buildCode(results),
        name: loadName() ?? "",
      });
    }

    const decodedName = (raw?: string): string => {
      if (!raw) return "";
      try {
        return decodeURIComponent(raw)
          .replace(/[|,]/g, " ")
          .trim()
          .slice(0, 40);
      } catch {
        return "";
      }
    };

    const params = new URLSearchParams(window.location.search);
    const m = params.get("m");
    const a = params.get("a");
    const b = params.get("b");

    if (m) {
      // Group link: ?m=Name%7Ccode,Name%7Ccode,...
      const parsed = m
        .split(",")
        .map((part) => {
          const sep = part.indexOf("|");
          const rawName = sep >= 0 ? part.slice(0, sep) : "";
          const rawCode = sep >= 0 ? part.slice(sep + 1) : part;
          const answers = parseAnswerString(rawCode);
          return answers ? { answers, name: decodedName(rawName) } : null;
        })
        .filter((x): x is { answers: number[]; name: string } => x !== null);
      if (parsed.length >= 2) {
        setSlots(
          parsed.map((p) => ({
            id: idRef.current++,
            value: p.answers.join(""),
            mine: false,
            name: p.name,
          }))
        );
      }
    } else if (a && b) {
      // Legacy pair link: ?a=...&b=...
      setSlots([
        { id: idRef.current++, value: a, mine: false },
        { id: idRef.current++, value: b, mine: false },
      ]);
    }
  }, []);

  const insight = useMemo(
    () => (members && members.length >= 2 ? groupInsights(members) : null),
    [members]
  );

  const updateSlot = useCallback((id: number, value: string) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, value, name: undefined } : s))
    );
  }, []);

  const removeSlot = useCallback((id: number) => {
    setSlots((prev) =>
      prev.length > 2 ? prev.filter((s) => s.id !== id) : prev
    );
  }, []);

  const addSlot = useCallback(() => {
    setSlots((prev) =>
      prev.length >= MAX_PEOPLE
        ? prev
        : [...prev, { id: idRef.current++, value: "", mine: false }]
    );
  }, []);

  // Drop the tester's own result into the first free slot (or a new one).
  const addMine = useCallback(() => {
    setSlots((prev) => {
      if (prev.some((s) => s.mine)) return prev;
      const empty = prev.findIndex((s) => !s.mine && !s.value.trim());
      if (empty >= 0) {
        return prev.map((s, i) =>
          i === empty ? { ...s, mine: true, value: "" } : s
        );
      }
      if (prev.length >= MAX_PEOPLE) return prev;
      return [...prev, { id: idRef.current++, value: "", mine: true }];
    });
  }, []);

  const useLinkInstead = useCallback((id: number) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, mine: false, value: "", name: undefined } : s
      )
    );
  }, []);

  const runCompare = useCallback(() => {
    const built: Compared[] = [];
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (s.mine) {
        if (!myResult) {
          setError(
            "Add your own result first: take the test, or paste your link below."
          );
          setMembers(null);
          return;
        }
        const results = computeResults(myResult.answers);
        built.push({
          name: myResult.name || "You",
          answers: myResult.answers,
          results,
          code: buildCode(results),
          mine: true,
        });
        continue;
      }
      const answers = parseAnswerString(s.value);
      if (!answers) {
        setError(
          `Person ${i + 1} needs a complete result: paste the full share link or the 20-digit code.`
        );
        setMembers(null);
        return;
      }
      const results = computeResults(answers);
      built.push({
        name: s.name || nameFromHash(s.value) || "",
        answers,
        results,
        code: buildCode(results),
        mine: false,
      });
    }
    setError(null);
    setMembers(built);
  }, [slots, myResult]);

  const handleCopyLink = useCallback(async () => {
    if (!members || members.length < 2) return;
    const parts = members.map(
      (m) => `${encodeURIComponent(m.name || "")}|${m.answers.join("")}`
    );
    const url = `${window.location.origin}/pair?m=${parts.join(",")}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Copy this comparison link:", url);
    }
    setTimeout(() => setCopied(false), 2500);
  }, [members]);

  const who = (m: Compared, i: number) =>
    m.mine
      ? m.name && m.name !== "You"
        ? `${m.name} (you)`
        : "You"
      : memberLabel(m, i);

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
          Compatibility check
        </h1>
        <p className="mt-3 max-w-xl text-white/55">
          Check how two or more people fit together. Use your own saved result,
          then add the people you want to compare: co-founders, a team, or a
          whole group. Nothing is stored; the comparison lives in the link.
        </p>
      </section>

      {/* Your own result */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        {myResult ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <CodeChip code={myResult.code} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
                  Your saved result
                </p>
                <p className="font-display text-sm font-semibold text-white">
                  {myResult.name || "You"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={addMine}
              disabled={myAdded}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {myAdded ? "Added ✓" : "Add to comparison"}
            </button>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-white/55">
            No result saved in this browser yet.{" "}
            <Link
              href="/quiz"
              className="underline decoration-white/30 underline-offset-4 transition-colors hover:text-white"
            >
              Take the test
            </Link>{" "}
            and it appears here automatically, or paste your link below.
          </p>
        )}
      </section>

      {/* People to compare */}
      <section className="mt-6">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-lg font-semibold text-white">
            People to compare
          </h2>
          <span className="text-xs text-white/40">
            {slots.length} of {MAX_PEOPLE}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {slots.map((s, i) => {
            const detected = s.name || nameFromHash(s.value);
            return (
              <div
                key={s.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/45">
                    {s.mine ? "You" : `Person ${i + 1}`}
                  </label>
                  {slots.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeSlot(s.id)}
                      className="text-xs text-white/40 transition-colors hover:text-rose-300"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {s.mine ? (
                  <div className="mt-3">
                    <p className="flex items-baseline gap-2">
                      <span className="font-display text-sm font-semibold text-white">
                        {myResult?.name || "Your result"}
                      </span>
                      <span className="text-xs text-white/45">
                        {myResult?.code}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() => useLinkInstead(s.id)}
                      className="mt-2 text-xs text-white/45 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white"
                    >
                      Use a pasted link instead
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      inputMode="url"
                      value={s.value}
                      onChange={(e) => updateSlot(s.id, e.target.value)}
                      placeholder={`Paste person ${i + 1}'s result link…`}
                      className="mt-3 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
                    />
                    {detected && (
                      <p className="mt-2 text-xs text-white/45">
                        Name: {detected}
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
        {slots.length < MAX_PEOPLE && (
          <button
            type="button"
            onClick={addSlot}
            className="mt-4 rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/50 hover:text-white"
          >
            + Add another person
          </button>
        )}
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runCompare}
          className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          Compare
        </button>
        {members && members.length >= 2 && (
          <button
            type="button"
            onClick={handleCopyLink}
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/50 hover:text-white"
          >
            {copied ? "Copied ✓" : "Copy comparison link"}
          </button>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-rose-400/90">{error}</p>}

      {/* Results */}
      {members && members.length >= 2 && insight && (
        <div className="mt-10 space-y-10">
          <section>
            <h2 className="font-display text-xl font-semibold text-white">
              The codes
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((m, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                    {who(m, i)}
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
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">
              The read
            </h2>
            <p className="mt-3 leading-relaxed text-white/65">
              {insight.summary}
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">
              Who covers what
            </h2>
            <div className="mt-4 space-y-3">
              {insight.roles.map((role) => {
                const p = PROFILES[role.letter];
                const owners = role.owners.map((idx) =>
                  who(members[idx], idx)
                );
                const missing = role.missing.map((idx) =>
                  who(members[idx], idx)
                );
                return (
                  <div
                    key={role.letter}
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
                        {p.name}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-white/55">
                        {owners.length > 0 ? (
                          <>
                            Natural fit for {owners.join(", ")}.
                            {missing.length > 0
                              ? ` Not held by ${missing.join(", ")}.`
                              : ""}
                          </>
                        ) : (
                          "Nobody is naturally strong here: a gap for this group."
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">
              Tensions to watch
            </h2>
            {insight.frictions.length > 0 ? (
              <>
                <p className="mt-2 text-sm text-white/45">
                  Not flaws: the axes where two people pull in opposite
                  directions. Naming them early prevents most founding-team
                  blow-ups.
                </p>
                <div className="mt-4 space-y-3">
                  {insight.frictions.map((f) => (
                    <div
                      key={`${f.a}-${f.b}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-sm font-semibold text-white">
                          {who(members[f.a], f.a)}
                        </span>
                        <span className="text-xs text-white/45">vs</span>
                        <span className="font-display text-sm font-semibold text-white">
                          {who(members[f.b], f.b)}
                        </span>
                        <span
                          className={`ml-1 rounded-full px-2 py-0.5 text-[11px] ring-1 ${tierTone(
                            f.tier
                          )}`}
                        >
                          {f.tier}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-white/55">
                        {f.watchFor}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-white/55">
                No strong crossed friction between any pair. The risk in this
                group is shared blind spots rather than open clashes: check
                which seats nobody covers.
              </p>
            )}
          </section>
        </div>
      )}

      <footer className="mt-auto border-t border-white/10 py-10">
        <p className="text-sm text-white/40">
          Everyone&apos;s data stays inside the shared link: nothing is sent to
          a server.
        </p>
        <div className="mt-4">
          <Attribution />
        </div>
      </footer>
    </main>
  );
}
