"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QuestionCard from "@/components/QuestionCard";
import { QUESTIONS } from "@/data/questions";
import { PROFILES } from "@/data/profiles";
import {
  ANSWER_COUNT,
  loadPartial,
  saveAnswers,
} from "@/lib/answers";

export default function QuizPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() =>
    Array(ANSWER_COUNT).fill(0)
  );
  const [ready, setReady] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resume from sessionStorage on mount (avoids hydration mismatch).
  useEffect(() => {
    const saved = loadPartial();
    if (saved) {
      setAnswers(saved);
      const firstUnanswered = saved.findIndex((a) => a < 1);
      setCurrent(firstUnanswered === -1 ? 0 : firstUnanswered);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  const handleSelect = useCallback(
    (value: number) => {
      setAnswers((prev) => {
        const next = [...prev];
        next[current] = value;
        saveAnswers(next);
        return next;
      });

      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(() => {
        if (current < ANSWER_COUNT - 1) {
          setCurrent((c) => c + 1);
        } else {
          router.push("/results");
        }
      }, 280);
    },
    [current, router]
  );

  const goBack = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setCurrent((c) => Math.max(0, c - 1));
  }, []);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-white/40">Loading…</p>
      </main>
    );
  }

  const question = QUESTIONS[current];
  const profile = PROFILES[question.dimension];
  const answeredCount = answers.filter((a) => a >= 1).length;
  const progress = ((current + 1) / ANSWER_COUNT) * 100;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6">
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

      {/* Progress */}
      <div className="w-full">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium text-white/70">
            Question {current + 1}{" "}
            <span className="text-white/35">of {ANSWER_COUNT}</span>
          </p>
          {answeredCount > 0 && (
            <p className="text-xs text-white/35">{answeredCount} answered</p>
          )}
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${progress}%`,
              backgroundColor: profile.color,
            }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex flex-1 items-center py-10">
        <div key={current} className="q-enter w-full">
          <QuestionCard
            question={question}
            value={answers[current]}
            onChange={handleSelect}
          />
        </div>
      </div>

      {/* Nav */}
      <footer className="flex items-center justify-between pb-10">
        <button
          type="button"
          onClick={goBack}
          disabled={current === 0}
          className={[
            "rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/70 transition-colors",
            current === 0
              ? "cursor-not-allowed opacity-30"
              : "hover:border-white/40 hover:text-white",
          ].join(" ")}
        >
          ← Back
        </button>
        <p className="text-xs text-white/30">No timer. Take your time.</p>
        <button
          type="button"
          onClick={() => {
            if (current < ANSWER_COUNT - 1) {
              if (advanceTimer.current) clearTimeout(advanceTimer.current);
              setCurrent((c) => c + 1);
            } else {
              router.push("/results");
            }
          }}
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          {current < ANSWER_COUNT - 1 ? "Skip →" : "See results →"}
        </button>
      </footer>
    </main>
  );
}
