"use client";

import ScaleSelector from "./ScaleSelector";
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
  return (
    <div className="w-full">
      <h2 className="font-display text-2xl font-semibold leading-snug text-white sm:text-3xl">
        {question.text}
      </h2>

      <div className="mt-8">
        <ScaleSelector value={value} onChange={onChange} />
      </div>

      <p className="mt-4 text-center text-xs text-white/50">
        1 = never · 5 = always
      </p>
    </div>
  );
}
