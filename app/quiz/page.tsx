"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QuestionCard from "@/components/QuestionCard";
import { QUESTIONS } from "@/data/questions";
import {
  ANSWER_COUNT,
  clearAnswers,
  loadName,
  loadOrder,
  loadPartial,
  saveAnswers,
  saveName,
  saveOrder,
  shuffledOrder,
} from "@/lib/answers";

export default function QuizPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() =>
    Array(ANSWER_COUNT).fill(0)
  );
  // Display order = shuffled question indices. Answers are stored by
  // question index, so shuffling never affects scoring or share links.
  const [order, setOrder] = useState<number[] | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resume mid-quiz from sessionStorage on mount (avoids hydration mismatch).
  // A *complete* saved set starts fresh instead: it usually means the user
  // just viewed a shared result link (which stores all 20 answers), and
  // resuming it would scatter old selections across the shuffled order.
  useEffect(() => {
    setName(loadName() ?? "");
    const saved = loadPartial();
    const complete = saved !== null && saved.every((a) => a >= 1);

    if (saved && !complete) {
      const savedOrder = loadOrder() ?? shuffledOrder();
      saveOrder(savedOrder);
      setOrder(savedOrder);
      setAnswers(saved);
      const firstUnanswered = savedOrder.findIndex((qi) => saved[qi] < 1);
      setCurrent(firstUnanswered === -1 ? 0 : firstUnanswered);
    } else {
      if (complete) clearAnswers();
      const freshOrder = shuffledOrder();
      saveOrder(freshOrder);
      setOrder(freshOrder);
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
      if (!order) return;
      const questionIndex = order[current];
      setAnswers((prev) => {
        const next = [...prev];
        next[questionIndex] = value;
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
    [current, order, router]
  );

  const goBack = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setCurrent((c) => Math.max(0, c - 1));
  }, []);

  if (!ready || !order) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-white/40">Loading…</p>
      </main>
    );
  }

  const question = QUESTIONS[order[current]];
  const answeredCount = answers.filter((a) => a >= 1).length;
  const progress = ((current + 1) / ANSWER_COUNT) * 100;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-6">
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
            <span className="text-white/50">of {ANSWER_COUNT}</span>
          </p>
          {answeredCount > 0 && (
            <p className="text-xs text-white/50">{answeredCount} answered</p>
          )}
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-white transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Name: optional, travels inside share links so mentors see who is who */}
      <div className="mt-3">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            const v = e.target.value.slice(0, 40);
            setName(v);
            saveName(v);
          }}
          placeholder="Your name (optional). It travels with your share link."
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
        />
      </div>

      {/* Question */}
      <div className="flex flex-1 items-center py-10">
        <div key={current} className="q-enter w-full">
          <QuestionCard
            question={question}
            value={answers[order[current]]}
            onChange={handleSelect}
          />
        </div>
      </div>

      {/* Nav */}
      <footer className="flex items-center justify-between gap-3 pb-10">
        <button
          type="button"
          onClick={goBack}
          disabled={current === 0}
          className={[
            "shrink-0 rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/70 transition-colors",
            current === 0
              ? "cursor-not-allowed opacity-30"
              : "hover:border-white/40 hover:text-white",
          ].join(" ")}
        >
          ← Back
        </button>
        <p className="hidden text-xs text-white/45 sm:block">
          No timer. Take your time.
        </p>
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
          className="shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          {current < ANSWER_COUNT - 1 ? "Skip →" : "See results →"}
        </button>
      </footer>
    </main>
  );
}
