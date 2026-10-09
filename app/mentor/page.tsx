"use client";

import {
  useCallback,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import Attribution from "@/components/Attribution";
import { PROFILES } from "@/data/profiles";
import type { Dimension } from "@/data/questions";
import { cohortReport } from "@/lib/pair";
import { computeCompatibility, tierTone } from "@/lib/compatibility";
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

// Password gate: the plaintext never appears in the bundle - only hashes.
// SHA-256 on secure contexts (localhost, Vercel); FNV-1a fallback for
// plain-HTTP LAN access where crypto.subtle is unavailable.
const MENTOR_SHA256 =
  "151c3cc8ed37ba38b78d87a4e89b48513e8b2976e0aeecc7dca504278abb0c9a";
const MENTOR_FNV = "abf98e6b";

function fnv1a(text: string): string {
  let h = 2166136261;
  for (const byte of new TextEncoder().encode(text)) {
    h ^= byte;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

async function checkPassword(input: string): Promise<boolean> {
  try {
    if (globalThis.crypto?.subtle) {
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(input)
      );
      const hex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      if (hex === MENTOR_SHA256) return true;
    }
  } catch {
    /* insecure context or no subtle API - fall through */
  }
  return fnv1a(input) === MENTOR_FNV;
}

function MentorGate({ onUnlock }: { onUnlock: () => void }) {
  const [pw, setPw] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pw || busy) return;
    setBusy(true);
    setError(false);
    const ok = await checkPassword(pw);
    if (ok) {
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setBusy(false);
      setPw("");
      setTimeout(() => setShake(false), 450);
    }
  };

  return (
    <main className="flex min-h-dvh w-full flex-col">
      <header className="flex items-center justify-between px-6 py-6">
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
      <div className="flex flex-1 items-center justify-center px-6 pb-12">
        <div
          className={`fade-up w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 ${
            shake ? "shake" : ""
          }`}
        >
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.05] text-white/80">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
              <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
            </svg>
          </span>
          <p className="mt-4 text-xs font-medium uppercase tracking-[0.25em] text-white/40">
            PAEI · Mentor workspace
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold text-white">
            Mentor access
          </h1>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/55">
            This workspace is for program mentors. Enter the mentor password to
            continue.
          </p>

          <form onSubmit={submit} className="mt-6 w-full space-y-3 text-left">
            <div className="relative">
              <input
                type={visible ? "text" : "password"}
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value);
                  setError(false);
                }}
                placeholder="Password"
                autoFocus
                className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 pr-12 text-center text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white/70"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
            <p className="text-center text-xs">
              {error ? (
                <span className="text-rose-400/90">
                  Wrong password. Ask your program lead.
                </span>
              ) : (
                <span className="text-white/40">Press Enter to unlock</span>
              )}
            </p>
            <button
              type="submit"
              disabled={busy || !pw}
              className="w-full rounded-full bg-white px-6 py-3 font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Checking…" : "Unlock"}
            </button>
          </form>

          <div className="mt-6 w-full border-t border-white/10 pt-4">
            <Attribution centered />
            <p className="mt-3 text-xs text-white/40">
              The check runs in your browser: nothing is stored or sent.
            </p>
          </div>
          </div>
        </div>
      </div>
    </main>
  );
}

type Mode = "roster" | "single" | "team" | "founders";

const MODES: { key: Mode; title: string; description: string; paste: string }[] = [
  {
    key: "roster",
    title: "View the whole class",
    description:
      "Group averages plus a card for every student: archetype, growth edge, and what to practice.",
    paste: "all links, one per line",
  },
  {
    key: "single",
    title: "Look at one person",
    description:
      "One student, read closely: archetype, growth edge, development focus, and a mentor note.",
    paste: "1 link",
  },
  {
    key: "team",
    title: "Check a team",
    description:
      "Pick the team size, then paste one link per member. See who covers what, gaps, and who to watch.",
    paste: "one link per member",
  },
  {
    key: "founders",
    title: "Compare two founders",
    description:
      "How well two people work together: what works, what to watch, where you both lack.",
    paste: "2 links, one each",
  },
];

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
  const [unlocked, setUnlocked] = useState(false);
  const [mode, setMode] = useState<Mode>("roster");
  const [raw, setRaw] = useState("");
  const [personLink, setPersonLink] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamSize, setTeamSize] = useState(4);
  const [teamFields, setTeamFields] = useState<string[]>([
    "",
    "",
    "",
    "",
  ]);
  const [founderFields, setFounderFields] = useState<string[]>(["", ""]);
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
  const ungroupedCards = useMemo(
    () => cards.filter((c) => !c.student.team),
    [cards]
  );
  // Each mode's inputs, assembled into the one format parseRoster understands.
  // Team mode writes its own [Name] header internally — mentors never type it.
  const assembled = useMemo(() => {
    if (mode === "roster") return raw;
    if (mode === "single") return personLink;
    if (mode === "founders")
      return founderFields.filter((f) => f.trim()).join("\n");
    const filled = teamFields.filter((f) => f.trim());
    if (filled.length === 0) return "";
    const name = (teamName.trim() || "Team").replace(/[[\]]/g, "");
    return `[${name}]\n${filled.join("\n")}`;
  }, [mode, raw, personLink, founderFields, teamFields, teamName]);
  const foundersCompat = useMemo(() => {
    if (!roster || roster.length < 2 || mode !== "founders") {
      return null;
    }
    const a = roster[0];
    const b = roster[1];
    return { a, b, report: computeCompatibility(a.results, b.results) };
  }, [roster, mode]);
  // Live paste feedback: mentors see what parsed before showing results.
  const preview = useMemo(() => {
    if (!assembled.trim()) return null;
    const { students, rejected: rej, teamsSeen: seen } = parseRoster(assembled);
    if (students.length === 0 && rej === 0) return null;
    return { links: students.length, rejected: rej, teams: seen.length };
  }, [assembled]);

  // Unlock lasts only while this page is open: every fresh visit asks again.
  const handleAnalyze = useCallback(() => {
    const { students, rejected: rej, teamsSeen: seen } = parseRoster(assembled);
    // Keep an empty array (not null) so the "no valid links" error can show.
    setRoster(students);
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
  }, [assembled]);

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
    const text = buildSummaryText(
      roster,
      snapshot,
      declared,
      proposals ?? [],
      moves,
      rejected
    );
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Copy the mentor summary:", text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [roster, snapshot, declared, proposals, moves, rejected]);

  // Single-select: switching modes clears results so nothing mixes.
  const selectMode = useCallback((m: Mode) => {
    setMode(m);
    setRoster(null);
    setRejected(0);
    setTeamsSeen([]);
    setProposals(null);
    setCopied(false);
  }, []);

  const changeTeamSize = useCallback((size: number) => {
    const clamped = Math.max(1, Math.min(8, size));
    setTeamSize(clamped);
    setTeamFields((prev) =>
      Array.from({ length: clamped }, (_, i) => prev[i] ?? "")
    );
  }, []);

  const clearInput = useCallback(() => {
    if (mode === "roster") setRaw("");
    else if (mode === "single") setPersonLink("");
    else if (mode === "team") {
      setTeamName("");
      setTeamFields(Array.from({ length: teamSize }, () => ""));
    } else setFounderFields(["", ""]);
  }, [mode, teamSize]);

  if (!unlocked) {
    return <MentorGate onUnlock={() => setUnlocked(true)} />;
  }

  const n = roster?.length ?? 0;
  const showSingle = mode === "single" && n >= 1;
  const singleNote = mode === "single" && n > 1;
  const showRosterCards = (mode === "roster" || mode === "team") && n > 0;
  const showTeamSection =
    declared.length > 0 && (mode === "roster" || mode === "team");
  const foundersHint = mode === "founders" && roster !== null && n === 1;
  const proposalsOn = mode === "roster";
  const movesOn = mode === "roster";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <Link
          href="/"
          className="text-sm text-white/50 transition-colors hover:text-white"
        >
          ← Home
        </Link>
        <div className="flex items-center gap-4">
          <span className="font-display text-sm font-medium text-white/60">
            Mentor view
          </span>
          <button
            type="button"
            onClick={() => setUnlocked(false)}
            className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/60 transition-colors hover:border-white/40 hover:text-white"
          >
            Lock
          </button>
        </div>
      </header>

      <section className="py-6">
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
          Mentor view
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/55">
          Choose what you want to see, paste the links, and get only that:
          one student, the whole roster, team coverage, or two founders.
          PAEI shows natural strengths, not ceilings: use it to set people up
          to succeed, not to sort them. Nothing is uploaded: the analysis runs
          in your browser.
        </p>
        <p className="mt-4 text-sm font-medium text-white/75">
          Pick what you want to see → paste the links → press Show results
        </p>
      </section>

      {/* Setup panel: choose modes, paste, preview, analyze */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
          What do you want to see?
        </p>
        <div
          className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"
          role="radiogroup"
          aria-label="What do you want to see?"
        >
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <button
                key={m.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => selectMode(m.key)}
                className={[
                  "rounded-2xl border p-4 text-left transition-colors",
                  active
                    ? "border-white/70 bg-white/[0.07]"
                    : "border-white/15 bg-white/[0.02] hover:border-white/40 hover:bg-white/[0.05]",
                ].join(" ")}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="font-display text-base font-semibold text-white">
                    {m.title}
                  </span>
                  <span
                    className={[
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                      active
                        ? "bg-white text-black"
                        : "border border-white/25 text-transparent",
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                </span>
                <span className="mt-1.5 block text-sm leading-relaxed text-white/60">
                  {m.description}
                </span>
                <span className="mt-3 block text-xs text-white/45">
                  <span className="text-white/60">Paste:</span> {m.paste}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-white/45">
          Pick one: the input below adapts to your choice.
        </p>

        <div className="mt-5 border-t border-white/10 pt-5">
          {mode === "roster" && (
            <>
              <label
                htmlFor="mentor-input"
                className="text-xs font-semibold uppercase tracking-wider text-white/45"
              >
                Paste everyone&apos;s links (one per line)
              </label>
              <textarea
                id="mentor-input"
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                rows={8}
                placeholder={
                  "Marijs, https://…/results#paei=43521435214352143521\nhttps://…/results#paei=54321543215432154321"
                }
                className="mt-3 w-full resize-y rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 font-mono text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
              />
              <p className="mt-2 text-xs text-white/45">
                One link per line. A name in front (Name, link) is optional.
                Several links on one line are fine too.
              </p>
            </>
          )}

          {mode === "single" && (
            <>
              <label
                htmlFor="mentor-person"
                className="text-xs font-semibold uppercase tracking-wider text-white/45"
              >
                Paste one link
              </label>
              <input
                id="mentor-person"
                type="text"
                value={personLink}
                onChange={(e) => setPersonLink(e.target.value)}
                placeholder="https://…/results#paei=… or Name, link"
                className="mt-3 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 font-mono text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
              />
            </>
          )}

          {mode === "team" && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
                How big is the team?
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  aria-label="Fewer members"
                  disabled={teamSize <= 1}
                  onClick={() => changeTeamSize(teamSize - 1)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 font-display text-lg text-white/70 transition-colors hover:border-white/40 disabled:opacity-30"
                >
                  −
                </button>
                <span className="min-w-[2.5ch] text-center font-display text-lg font-semibold text-white">
                  {teamSize}
                </span>
                <button
                  type="button"
                  aria-label="More members"
                  disabled={teamSize >= 8}
                  onClick={() => changeTeamSize(teamSize + 1)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 font-display text-lg text-white/70 transition-colors hover:border-white/40 disabled:opacity-30"
                >
                  +
                </button>
                <span className="text-sm text-white/50">
                  member{teamSize === 1 ? "" : "s"}
                </span>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Team name (optional)"
                  maxLength={30}
                  className="ml-auto w-44 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
                />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-white/45">
                Member links
              </p>
              <div className="mt-3 space-y-2">
                {teamFields.map((v, i) => (
                  <input
                    key={i}
                    type="text"
                    value={v}
                    onChange={(e) =>
                      setTeamFields((prev) =>
                        prev.map((x, j) => (j === i ? e.target.value : x))
                      )
                    }
                    placeholder={`Member ${i + 1} link`}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 font-mono text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
                  />
                ))}
              </div>
            </>
          )}

          {mode === "founders" && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
                Paste both links
              </p>
              <div className="mt-3 space-y-2">
                {founderFields.map((v, i) => (
                  <input
                    key={i}
                    type="text"
                    value={v}
                    onChange={(e) =>
                      setFounderFields((prev) =>
                        prev.map((x, j) => (j === i ? e.target.value : x))
                      )
                    }
                    placeholder={i === 0 ? "First person" : "Second person"}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 font-mono text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-white/45">
                Order does not matter. A name in front (Name, link) is optional.
              </p>
            </>
          )}

          {preview && (
            <p className="mt-3 text-xs">
              <span className="text-emerald-300">
                {preview.links} link{preview.links === 1 ? "" : "s"} found
              </span>
              {preview.teams > 0 && (
                <span className="text-white/50">
                  {" "}
                  · {preview.teams} team{preview.teams === 1 ? "" : "s"}
                </span>
              )}
              {preview.rejected > 0 && (
                <span className="text-amber-300">
                  {" "}
                  · {preview.rejected} unreadable
                </span>
              )}
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!assembled.trim()}
            className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Show results →
          </button>
          {assembled.trim() && (
            <button
              type="button"
              onClick={clearInput}
              className="rounded-full border border-white/15 px-5 py-3 text-sm text-white/55 transition-colors hover:border-white/40 hover:text-white"
            >
              Clear
            </button>
          )}
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
      </section>

      {roster && roster.length === 0 && (
        <p className="mt-4 text-sm text-rose-400/90">
          No valid result links found. Paste complete share links (or their
          20-digit codes).
          {rejected > 0 && ` ${rejected} item(s) could not be read.`}
        </p>
      )}
      {roster && roster.length > 0 && rejected > 0 && (
        <p className="mt-4 text-sm text-white/45">
          {rejected} item(s) could not be read and were skipped.
        </p>
      )}

      {/* Mode-specific hints when data is missing */}
      {singleNote && (
        <p className="mt-4 text-sm text-white/45">
          That field takes one link - showing the first of the {n} you pasted.
        </p>
      )}
      {foundersHint && (
        <p className="mt-4 text-sm text-white/45">
          Comparing founders needs two links - you pasted {n}. Fill in both
          fields above.
        </p>
      )}

      {/* ============================================================ ONE PERSON */}
      {showSingle && (
        <section className="mt-10 border-t border-white/10 pt-10">
          <h2 className="font-display text-xl font-semibold text-white">
            One person
          </h2>
          <p className="mt-2 text-sm text-white/45">
            Full read for the single pasted link.
          </p>
          {cards[0] && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex flex-wrap items-center gap-4">
                <CodeLetters code={cards[0].student.code} size="3rem" />
                <div>
                  <h3 className="font-display text-xl font-semibold text-white">
                    {cards[0].student.name}
                  </h3>
                  <p className="text-sm text-white/45">
                    {cards[0].archetype}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-white/60">
                {cards[0].archetypeLine}
              </p>
              <div className="mt-4 space-y-2">
                <p className="text-sm leading-relaxed text-white/65">
                  <span className="font-medium text-white/80">
                    Growth edge:{" "}
                  </span>
                  {PROFILES[cards[0].weakestLetter].name} -{" "}
                  {cards[0].growthEdge}
                </p>
                <p className="text-sm leading-relaxed text-white/65">
                  <span className="font-medium text-white/80">
                    Development focus:{" "}
                  </span>
                  {cards[0].devFocus.replace(/^Development focus: /, "")}
                </p>
                <p className="text-sm leading-relaxed text-white/65">
                  <span className="font-medium text-white/80">
                    Mentor note:{" "}
                  </span>
                  {cards[0].mentorNote}
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ============================================================ FOUNDERS */}
      {foundersCompat && (
        <section className="mt-10 border-t border-white/10 pt-10">
          <h2 className="font-display text-xl font-semibold text-white">
            Founders
          </h2>
          <p className="mt-2 text-sm text-white/45">
            How the first two people in your paste work together.
          </p>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[foundersCompat.a, foundersCompat.b].map((s, i) => (
                <div key={s.id} className="flex items-center gap-4">
                  <CodeLetters code={s.code} size="1.75rem" />
                  <div>
                    <p className="text-xs text-white/45">
                      {i === 0 ? "First" : "Second"}
                    </p>
                    <p className="font-display text-lg font-semibold text-white">
                      {s.name}
                    </p>
                    <p className="text-xs text-white/45">
                      {cards[i]?.archetype}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tierTone(
                  foundersCompat.report.tier
                )}`}
              >
                {foundersCompat.report.tier}
              </span>
              <span className="text-xs text-white/45">
                How you two work together
              </span>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm leading-relaxed text-white/65">
                <span className="font-medium text-white/80">
                  What works:{" "}
                </span>
                {foundersCompat.report.whatWorks}
              </p>
              <p className="text-sm leading-relaxed text-white/65">
                <span className="font-medium text-white/80">
                  Watch for:{" "}
                </span>
                {foundersCompat.report.watchFor}
              </p>
              <p className="text-sm leading-relaxed text-white/65">
                <span className="font-medium text-white/80">
                  Where we lack:{" "}
                </span>
                {foundersCompat.report.whereWeLack}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ==================================================== COHORT SNAPSHOT */}
      {snapshot && mode === "roster" && (
        <section className="mt-10 border-t border-white/10 pt-10">
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
      {showTeamSection && (
        <section className="mt-10 border-t border-white/10 pt-10">
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
      {showRosterCards && (
        <section className="mt-10 border-t border-white/10 pt-10">
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
      {proposals && proposalsOn && proposals.length > 0 && (
        <section className="mt-10 border-t border-white/10 pt-10">
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
      {movesOn && roster && roster.length > 0 && moves.length === 0 && (
        <section className="mt-10 border-t border-white/10 pt-10">
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
      {movesOn && moves.length > 0 && (
        <section className="mt-10 border-t border-white/10 pt-10">
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

      {/* Bottom actions: mentors reach these after scrolling long results */}
      {roster && roster.length > 0 && (
        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-white/10 pt-8">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            {copied ? "Copied ✓" : "Copy mentor summary"}
          </button>
          <a
            href="#mentor-input"
            className="rounded-full border border-white/15 px-6 py-3 text-sm text-white/60 transition-colors hover:border-white/40 hover:text-white"
          >
            ↑ Back to input
          </a>
        </div>
      )}

      <footer className="mt-auto border-t border-white/10 py-8">
        <p className="text-xs text-white/45">
          Nothing is stored or sent anywhere: the analysis runs in your browser.
          Mentor view, PAEI app - Future Leaders - Leadership I.
        </p>
        <div className="mt-3">
          <Attribution />
        </div>
      </footer>
    </main>
  );
}
