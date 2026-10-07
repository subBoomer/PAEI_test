import type { Dimension } from "./questions";

export interface PerceptionQuestion {
  id: number;
  dimension: Dimension;
  text: string;
}

/**
 * Third-person behavioral statements for "Rate Your People".
 * Wording rule: observable behavior, never value judgments —
 * the rater answers for the person they know, not for an ideal.
 */
export const PERCEPTION_QUESTIONS: PerceptionQuestion[] = [
  // Producer (P)
  {
    id: 1,
    dimension: "P",
    text: "When something needs to be done, they start immediately, even before having all the details.",
  },
  {
    id: 2,
    dimension: "P",
    text: "They would rather do a task themselves than delegate it and wait for someone else to finish.",
  },
  {
    id: 3,
    dimension: "P",
    text: "When they take on something, they push through obstacles until it is done.",
  },
  {
    id: 4,
    dimension: "P",
    text: "When someone asks how something is going, they show results rather than talk about plans.",
  },
  // Administrator (A)
  {
    id: 5,
    dimension: "A",
    text: "Before starting anything, they want to know the full scope, who does what, and how long it takes.",
  },
  {
    id: 6,
    dimension: "A",
    text: "They get frustrated when people skip processes or do things without a plan.",
  },
  {
    id: 7,
    dimension: "A",
    text: "When something goes wrong, their first question is what process failed.",
  },
  {
    id: 8,
    dimension: "A",
    text: "They keep track of details that other people do not even notice.",
  },
  // Entrepreneur (E)
  {
    id: 9,
    dimension: "E",
    text: "They get excited by new ideas, even risky ones, and want to act on them quickly.",
  },
  {
    id: 10,
    dimension: "E",
    text: "When they see an opportunity, they want to move before someone else does.",
  },
  {
    id: 11,
    dimension: "E",
    text: "They challenge how things are currently done and look for better ways.",
  },
  {
    id: 12,
    dimension: "E",
    text: "They would rather try something new and fail than keep doing things the same way forever.",
  },
  // Integrator (I)
  {
    id: 13,
    dimension: "I",
    text: "When two people they know are in conflict, they want to help resolve it.",
  },
  {
    id: 14,
    dimension: "I",
    text: "They notice when someone is stressed or unhappy, even if that person does not say it.",
  },
  {
    id: 15,
    dimension: "I",
    text: "They make decisions based on how they affect people, not just outcomes.",
  },
  {
    id: 16,
    dimension: "I",
    text: "They care about how everyone in the group gets along, not just what gets done.",
  },
];
