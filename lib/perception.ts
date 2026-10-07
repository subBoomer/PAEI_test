import { PERCEPTION_QUESTIONS } from "@/data/perception-questions";
import { DIMENSION_ORDER, type Dimension } from "@/data/questions";
import { rankFromAverage, type DimensionResult } from "@/lib/scoring";

export const PERCEPTION_ANSWER_COUNT = PERCEPTION_QUESTIONS.length; // 16

/** 16 answers (by question index) → perceived DimensionResults. Same thresholds as the main test. */
export function computePerceivedResults(answers: number[]): DimensionResult[] {
  const buckets: Record<Dimension, number[]> = { P: [], A: [], E: [], I: [] };

  PERCEPTION_QUESTIONS.forEach((q, i) => {
    const a = answers[i];
    if (a >= 1 && a <= 5) buckets[q.dimension].push(a);
  });

  return DIMENSION_ORDER.map((letter) => {
    const values = buckets[letter];
    const raw = values.length
      ? values.reduce((sum, v) => sum + v, 0) / values.length
      : 0;
    const average = Math.round(raw * 10) / 10;
    const rank = rankFromAverage(average);
    return {
      letter,
      average,
      rank,
      capital: rank === "Very Dominant" || rank === "Dominant",
    };
  });
}

/**
 * Parse a manually typed code like "PAei" (order P, A, E, I).
 * Capital → Dominant (4.0), small → Secondary (3.0). Missing is not
 * expressible by hand — the fallback exists so nobody is forced back
 * into the full test.
 */
export function parseManualCode(
  raw: string
): { code: string; results: DimensionResult[] } | null {
  const s = raw.trim();
  if (!/^[PpAaEeIi]{4}$/.test(s)) return null;
  const letters: Dimension[] = ["P", "A", "E", "I"];
  const results = letters.map((letter, i) => {
    const capital = s[i] === s[i].toUpperCase();
    return {
      letter,
      average: capital ? 4.0 : 3.0,
      rank: capital
        ? ("Dominant" as const)
        : ("Secondary" as const),
      capital,
    };
  });
  const code = results
    .map((r) => (r.capital ? r.letter : r.letter.toLowerCase()))
    .join("");
  return { code, results };
}

/** Fisher–Yates over n indices. Used to shuffle perception questions per person. */
export function shuffleIndices(n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
