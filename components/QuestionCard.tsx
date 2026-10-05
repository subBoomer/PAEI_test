"use client";

import ScaleSelector from "./ScaleSelector";
import { PROFILES } from "@/data/profiles";
import type { Question } from "@/data/questions";

interface QuestionCardProps {
  question: Question;
  value: number;
  onChange: (value: number) => void;
}

export default function QuestionCard({
  question,
  value,
  onChange,
}: QuestionCardProps) {
  const profile = PROFILES[question.dimension];

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-md font-display text-xs font-bold"
          style={{ backgroundColor: `${profile.color}26`, color: profile.color }}
        >
          {profile.letter}
        </span>
        <span className="text-xs font-medium uppercase tracking-wider text-white/40">
          {profile.name}
        </span>
      </div>

      <h2 className="mt-5 font-display text-2xl font-semibold leading-snug text-white sm:text-3xl">
        {question.text}
      </h2>

      <div className="mt-8">
        <ScaleSelector value={value} onChange={onChange} />
      </div>

      <p className="mt-4 text-center text-xs text-white/30">
        1 = never · 5 = always
      </p>
    </div>
  );
}
