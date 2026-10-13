export type SelectionDecision =
  | { kind: "ignore" }
  | { kind: "commit" }
  | { kind: "confirm"; from: number };

/**
 * What a click on `value` should do for a question whose current answer is
 * `prev` (0 = unanswered), given whether a previous selection is still being
 * committed (`locked`, during the short auto-advance window).
 *
 * - locked: ignore the click. Guardrail against a fast second selection
 *   silently overwriting an answer while the quiz is advancing.
 * - unanswered, or the same value again: commit immediately.
 * - a different value on an already answered question: ask before changing.
 */
export function decideSelection(
  prev: number,
  value: number,
  locked: boolean
): SelectionDecision {
  if (locked) return { kind: "ignore" };
  if (prev >= 1 && prev !== value) return { kind: "confirm", from: prev };
  return { kind: "commit" };
}
