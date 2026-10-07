"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import QuestionCard from "@/components/QuestionCard";
import { PERCEPTION_QUESTIONS } from "@/data/perception-questions";
import { PROFILES } from "@/data/profiles";
import { loadCompleted } from "@/lib/answers";
import {
  buildCode,
  computeResults,
  type DimensionResult,
} from "@/lib/scoring";
import {
  PERCEPTION_ANSWER_COUNT,
  computePerceivedResults,
  parseManualCode,
  shuffleIndices,
} from "@/lib/perception";
import {
  codeMeaning,
  computeCompatibility,
  tierTone,
  type CompatibilityReport,
} from "@/lib/compatibility";
import {
  clearRateSession,
  emptySession,
  loadRateSession,
  saveRateSession,
  type RatedPerson,
} from "@/lib/rate-session";

type Step = "entry" | "names" | "quiz" | "card" | "map";

function CodeLetters({ code, size }: { code: string; size: string }) {
  return (
    <span className="font-display font-bold leading-none" style={{ fontSize: size }}>
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

function buildSummaryText(
  name: string,
  code: string,
  report: CompatibilityReport
): string {
  return [
    `I rated ${name} as ${code} — ${report.tier}.`,
    `What works: ${report.whatWorks}`,
    `Watch for: ${report.watchFor}`,
    `Where we lack: ${report.whereWeLack}`,
    "— Rated on the PAEI app · Future Leaders — Leadership I",
  ].join("\n");
}

export default function RatePage() {
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>("entry");

  const [raterName, setRaterName] = useState("");
  const [ownCode, setOwnCode] = useState("");
  const [ownSource, setOwnSource] = useState<"test" | "manual">("test");
  const [manualCode, setManualCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  const [people, setPeople] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const [currentName, setCurrentName] = useState<string | null>(null);
  const [showingName, setShowingName] = useState<string | null>(null);
  const [questionOrder, setQuestionOrder] = useState<number[]>([]);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() =>
    Array(PERCEPTION_ANSWER_COUNT).fill(0)
  );

  const [rated, setRated] = useState<RatedPerson[]>([]);
  const [presentFor, setPresentFor] = useState<string | null>(null);
  const [copiedFor, setCopiedFor] = useState<string | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beginPerson = useCallback((name: string) => {
    setCurrentName(name);
    setQuestionOrder(shuffleIndices(PERCEPTION_ANSWER_COUNT));
    setAnswers(Array(PERCEPTION_ANSWER_COUNT).fill(0));
    setQuestionIdx(0);
    setStep("quiz");
  }, []);

  // Restore session / detect own code from the main test (avoids hydration mismatch).
  useEffect(() => {
    const session = loadRateSession();
    if (session && session.raterName) {
      setRaterName(session.raterName);
      setOwnCode(session.ownCode);
      setOwnSource(session.ownSource);
      setPeople(session.people);
      setRated(session.rated);
      if (session.draftName && session.draftOrder && session.draftAnswers) {
        setCurrentName(session.draftName);
        setQuestionOrder(session.draftOrder);
        setAnswers(session.draftAnswers);
        const firstUnanswered = session.draftOrder.findIndex(
          (qi) => session.draftAnswers![qi] < 1
        );
        setQuestionIdx(firstUnanswered === -1 ? 0 : firstUnanswered);
        setStep("quiz");
      } else if (session.people.length > 0) {
        const next = session.people.find(
          (n) => !session.rated.some((r) => r.name === n)
        );
        if (next) {
          beginPerson(next);
        } else if (session.rated.length > 0) {
          setShowingName(session.rated[session.rated.length - 1].name);
          setStep("map");
        } else {
          setStep("names");
        }
      } else {
        setStep("names");
      }
    } else {
      const completed = loadCompleted();
      if (completed) {
        setOwnCode(buildCode(computeResults(completed)));
        setOwnSource("test");
      } else {
        setOwnSource("manual");
      }
    }
    setReady(true);
  }, [beginPerson]);

  // Persist everything — results die with the tab, but a refresh mid-flow
  // should not lose work.
  useEffect(() => {
    if (!ready) return;
    saveRateSession({
      ...emptySession(),
      raterName,
      ownCode,
      ownSource,
      people,
      rated,
      draftName: step === "quiz" ? currentName : null,
      draftAnswers: step === "quiz" ? answers : null,
      draftOrder: step === "quiz" ? questionOrder : null,
    });
  }, [
    ready,
    raterName,
    ownCode,
    ownSource,
    people,
    rated,
    step,
    currentName,
    answers,
    questionOrder,
  ]);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  const ownResults: DimensionResult[] | null = useMemo(() => {
    if (!ownCode) return null;
    if (ownSource === "test") {
      const completed = loadCompleted();
      if (completed) return computeResults(completed);
    }
    return parseManualCode(ownCode)?.results ?? null;
  }, [ownCode, ownSource]);

  // ---- Entry ----
  const manualParsed = useMemo(() => parseManualCode(manualCode), [manualCode]);
  const entryValid =
    raterName.trim().length > 0 &&
    (ownSource === "test" ? ownCode.length === 4 : manualParsed !== null);

  const handleEntryContinue = useCallback(() => {
    if (!entryValid) return;
    if (ownSource === "manual" && manualParsed) {
      setOwnCode(manualParsed.code);
      setCodeError(null);
    }
    setStep("names");
  }, [entryValid, ownSource, manualParsed]);

  // ---- Names ----
  const handleAddPerson = useCallback(() => {
    const name = nameInput.trim();
    if (!name) return;
    if (people.some((p) => p.toLowerCase() === name.toLowerCase())) {
      setNameError("That name is already on the list.");
      return;
    }
    setPeople((prev) => [...prev, name]);
    setNameInput("");
    setNameError(null);
  }, [nameInput, people]);

  // ---- Quiz ----
  const handleSelect = useCallback(
    (value: number) => {
      if (questionOrder.length === 0) return;
      const qIndex = questionOrder[questionIdx];
      setAnswers((prev) => {
        const next = [...prev];
        next[qIndex] = value;
        return next;
      });

      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(() => {
        if (questionIdx < PERCEPTION_ANSWER_COUNT - 1) {
          setQuestionIdx((c) => c + 1);
        } else if (currentName) {
          // Finish this person — compute perceived code, store, show card.
          setAnswers((finalAnswers) => {
            const perceived = computePerceivedResults(finalAnswers);
            const code = buildCode(perceived);
            setRated((prev) => [
              ...prev.filter((r) => r.name !== currentName),
              { name: currentName, answers: finalAnswers, perceivedCode: code },
            ]);
            setShowingName(currentName);
            setStep("card");
            return finalAnswers;
          });
        }
      }, 280);
    },
    [questionIdx, questionOrder, currentName]
  );

  const handleQuizBack = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setQuestionIdx((c) => Math.max(0, c - 1));
  }, []);

  // ---- Display data for card / map ----
  const displayFor = useCallback(
    (name: string) => {
      const person = rated.find((r) => r.name === name);
      if (!person || !ownResults) return null;
      const perceived = computePerceivedResults(person.answers);
      const code = buildCode(perceived);
      const report = computeCompatibility(ownResults, perceived);
      return { person, perceived, code, report };
    },
    [rated, ownResults]
  );

  const handleCopy = useCallback(
    async (name: string) => {
      const data = displayFor(name);
      if (!data) return;
      const text = buildSummaryText(name, data.code, data.report);
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        window.prompt("Copy the summary:", text);
      }
      setCopiedFor(name);
      setTimeout(() => setCopiedFor((c) => (c === name ? null : c)), 2500);
    },
    [displayFor]
  );

  const handleStartOver = useCallback(() => {
    if (
      !window.confirm(
        "Start a new test? This clears the people you rated in this session."
      )
    ) {
      return;
    }
    clearRateSession();
    setRaterName("");
    setOwnCode("");
    setManualCode("");
    setPeople([]);
    setRated([]);
    setCurrentName(null);
    setShowingName(null);
    setPresentFor(null);
    setStep("entry");
    const completed = loadCompleted();
    if (completed) {
      setOwnCode(buildCode(computeResults(completed)));
      setOwnSource("test");
    } else {
      setOwnSource("manual");
    }
  }, []);

  if (!ready) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-white/40">Loading…</p>
      </main>
    );
  }

  const unratedRemaining = people.filter(
    (n) => !rated.some((r) => r.name === n)
  );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <Link
          href="/"
          className="text-sm text-white/50 transition-colors hover:text-white"
        >
          ← Home
        </Link>
        <div className="flex items-center gap-4">
          <span className="font-display text-sm font-medium text-white/60">
            Rate your people
          </span>
          {(raterName || people.length > 0 || rated.length > 0 || currentName) && (
            <button
              type="button"
              onClick={handleStartOver}
              className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/60 transition-colors hover:border-white/40 hover:text-white"
            >
              New test
            </button>
          )}
        </div>
      </header>

      {/* ================================================================ ENTRY */}
      {step === "entry" && (
        <section className="flex flex-1 flex-col justify-center py-8">
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Whose people are we rating?
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/55">
            You analyze specific people — their perceived code, whether you can
            work with them, and where each of you lacks. Perception, not truth:
            this is data about the relationship, not a verdict on the person.
          </p>

          <label className="mt-10 block">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/45">
              Your name
            </span>
            <input
              type="text"
              value={raterName}
              onChange={(e) => setRaterName(e.target.value)}
              placeholder="e.g. Timurs"
              className="mt-3 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
            />
          </label>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
              You are rating as
            </p>
            {ownSource === "test" && ownCode ? (
              <div className="mt-3 flex items-center justify-between gap-4">
                <CodeLetters code={ownCode} size="2.25rem" />
                <button
                  type="button"
                  onClick={() => {
                    setOwnSource("manual");
                    setOwnCode("");
                    setManualCode("");
                  }}
                  className="text-sm text-white/50 underline-offset-4 hover:text-white hover:underline"
                >
                  change
                </button>
              </div>
            ) : (
              <div className="mt-3">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => {
                    setManualCode(e.target.value);
                    setCodeError(null);
                  }}
                  placeholder="PAei"
                  maxLength={4}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 font-display text-xl tracking-widest text-white placeholder:font-sans placeholder:text-base placeholder:tracking-normal placeholder:text-white/40 focus:border-white/40 focus:outline-none"
                />
                <p className="mt-2 text-xs text-white/45">
                  Four letters in order P A E I — capital = dominant, small =
                  secondary. Loaded from your test when available.
                </p>
                {codeError && (
                  <p className="mt-2 text-sm text-rose-400/90">{codeError}</p>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleEntryContinue}
            disabled={!entryValid}
            className="mt-8 rounded-full bg-white px-8 py-4 font-display text-base font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Start rating →
          </button>
        </section>
      )}

      {/* ================================================================ NAMES */}
      {step === "names" && (
        <section className="flex flex-1 flex-col py-8">
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Who are you analyzing?
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            Pick the people you are least sure about — that is where the answer
            matters. Typical: 2–4 people. Names stay in this browser tab only.
          </p>

          <div className="mt-8 flex gap-3">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                setNameError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddPerson();
              }}
              placeholder="Name"
              className="flex-1 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddPerson}
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              Add
            </button>
          </div>
          {nameError && (
            <p className="mt-2 text-sm text-rose-400/90">{nameError}</p>
          )}

          {people.length > 0 && (
            <ul className="mt-6 space-y-2">
              {people.map((name) => (
                <li
                  key={name}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <span className="text-white/80">{name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPeople((prev) => prev.filter((p) => p !== name))
                    }
                    aria-label={`Remove ${name}`}
                    className="text-white/35 transition-colors hover:text-rose-300"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-auto pt-10">
            <button
              type="button"
              onClick={() => {
                const next = people[0];
                if (next) beginPerson(next);
              }}
              disabled={people.length === 0}
              className="rounded-full bg-white px-8 py-4 font-display text-base font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Rate {people.length > 0 ? people[0] : "people"} →
            </button>
          </div>
        </section>
      )}

      {/* ================================================================ QUIZ */}
      {step === "quiz" && currentName && (
        <>
          <div className="w-full">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium text-white/70">
                Questions about {currentName}{" "}
                <span className="text-white/35">
                  — {questionIdx + 1} of {PERCEPTION_ANSWER_COUNT}
                </span>
              </p>
              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (advanceTimer.current) clearTimeout(advanceTimer.current);
                  setStep("names");
                }}
                className="text-xs text-white/40 transition-colors hover:text-white"
              >
                ← People
              </Link>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white transition-all duration-300 ease-out"
                style={{
                  width: `${((questionIdx + 1) / PERCEPTION_ANSWER_COUNT) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="flex flex-1 items-center py-10">
            <div key={currentName + questionIdx} className="q-enter w-full">
              <QuestionCard
                question={PERCEPTION_QUESTIONS[questionOrder[questionIdx]]}
                value={answers[questionOrder[questionIdx]]}
                onChange={handleSelect}
              />
            </div>
          </div>

          <footer className="flex items-center justify-between gap-3 pb-10">
            <button
              type="button"
              onClick={handleQuizBack}
              disabled={questionIdx === 0}
              className={[
                "shrink-0 rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/70 transition-colors",
                questionIdx === 0
                  ? "cursor-not-allowed opacity-30"
                  : "hover:border-white/40 hover:text-white",
              ].join(" ")}
            >
              ← Back
            </button>
            <p className="hidden text-xs text-white/45 sm:block">
              Answer for the person you know, not an ideal.
            </p>
            <div className="w-20" />
          </footer>
        </>
      )}

      {/* ================================================================ CARD */}
      {step === "card" &&
        showingName &&
        (() => {
          const data = displayFor(showingName);
          if (!data) return null;
          const { perceived, code, report } = data;
          return (
            <section className="flex flex-1 flex-col py-6">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">
                How you see them
              </p>
              <p className="mt-1 text-xs text-white/45">
                Perception, not truth — this is data about the relationship, not
                a verdict on {showingName}.
              </p>

              <div className="mt-6 flex items-end justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-white">
                    {showingName}
                  </h1>
                  <div className="mt-2">
                    <CodeLetters code={code} size="3.5rem" />
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tierTone(
                    report.tier
                  )}`}
                >
                  {report.tier}
                </span>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-white/60">
                {codeMeaning(perceived)}
              </p>

              <div className="mt-6 space-y-3">
                {report.reasons.map((line, i) => (
                  <p key={i} className="text-sm leading-relaxed text-white/65">
                    {line}
                  </p>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  Where each of you lacks
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  {report.whereWeLack}
                </p>
              </div>

              <div className="mt-auto flex flex-wrap gap-3 pt-8">
                <button
                  type="button"
                  onClick={() => handleCopy(showingName)}
                  className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98]"
                >
                  {copiedFor === showingName ? "Copied ✓" : "Copy summary"}
                </button>
                <button
                  type="button"
                  onClick={() => setPresentFor(showingName)}
                  className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/50 hover:text-white"
                >
                  Present
                </button>
                {unratedRemaining.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => beginPerson(unratedRemaining[0])}
                    className="rounded-full border border-white/10 px-6 py-3 text-sm text-white/50 transition-colors hover:text-white"
                  >
                    Next: {unratedRemaining[0]} →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStep("map")}
                    className="rounded-full border border-white/10 px-6 py-3 text-sm text-white/50 transition-colors hover:text-white"
                  >
                    See the room →
                  </button>
                )}
              </div>
            </section>
          );
        })()}

      {/* ================================================================== MAP */}
      {step === "map" && (
        <section className="flex flex-1 flex-col py-6">
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Your room
          </h1>
          <p className="mt-3 text-sm font-medium leading-relaxed text-amber-200/80">
            The people you rated are in this room. Present out loud — hearing
            how you are seen is the point.
          </p>
          <p className="mt-2 text-xs text-white/45">
            Rating as {ownCode} · perception, not truth
          </p>

          <div className="mt-6 space-y-3">
            {rated.map((person) => {
              const data = displayFor(person.name);
              if (!data) return null;
              return (
                <div
                  key={person.name}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <CodeLetters code={data.code} size="1.75rem" />
                      <span className="font-display text-lg font-semibold text-white">
                        {person.name}
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tierTone(
                        data.report.tier
                      )}`}
                    >
                      {data.report.tier}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(person.name)}
                      className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/70 transition-colors hover:border-white/40 hover:text-white"
                    >
                      {copiedFor === person.name ? "Copied ✓" : "Copy summary"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresentFor(person.name)}
                      className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/70 transition-colors hover:border-white/40 hover:text-white"
                    >
                      Present
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-auto flex flex-wrap gap-3 pt-10">
            <button
              type="button"
              onClick={() => setStep("names")}
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              Rate more people
            </button>
            <button
              type="button"
              onClick={handleStartOver}
              className="rounded-full border border-white/10 px-6 py-3 text-sm text-white/50 transition-colors hover:text-white"
            >
              New test
            </button>
          </div>
        </section>
      )}

      {/* ======================================================= PRESENT MODE */}
      {presentFor &&
        (() => {
          const data = displayFor(presentFor);
          if (!data) return null;
          const { perceived, code, report } = data;
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-6"
              onClick={() => setPresentFor(null)}
              role="dialog"
              aria-label={`Presenting ${presentFor}`}
            >
              <div
                className="max-h-full w-full max-w-2xl overflow-y-auto text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-xs font-medium uppercase tracking-[0.25em] text-white/40">
                  How you see them
                </p>
                <h2 className="mt-3 font-display text-3xl font-bold text-white">
                  {presentFor}
                </h2>
                <div className="mt-5 flex justify-center">
                  <CodeLetters code={code} size="clamp(3.5rem, 16vw, 6rem)" />
                </div>
                <div className="mt-4">
                  <span
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ${tierTone(
                      report.tier
                    )}`}
                  >
                    {report.tier}
                  </span>
                </div>
                <p className="mt-5 text-base leading-relaxed text-white/60">
                  {codeMeaning(perceived)}
                </p>
                <div className="mt-7 space-y-4 text-left">
                  <p className="text-lg leading-relaxed text-white/85">
                    <span className="font-semibold text-white">What works: </span>
                    {report.whatWorks}
                  </p>
                  <p className="text-lg leading-relaxed text-white/85">
                    <span className="font-semibold text-white">Watch for: </span>
                    {report.watchFor}
                  </p>
                  <p className="text-lg leading-relaxed text-white/85">
                    <span className="font-semibold text-white">
                      Where we lack:{" "}
                    </span>
                    {report.whereWeLack}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPresentFor(null)}
                  className="mt-9 rounded-full bg-white px-7 py-3 font-semibold text-black"
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}

      <footer className="border-t border-white/10 py-8">
        <p className="text-xs text-white/45">
          Your session stays in this browser tab — a refresh resumes where you
          left off. Use New test to clear it and start over. Nothing is sent
          anywhere. Rated on the PAEI app · Future Leaders — Leadership I.
        </p>
      </footer>
    </main>
  );
}
