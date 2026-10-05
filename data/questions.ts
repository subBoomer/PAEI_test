export type Dimension = "P" | "A" | "E" | "I";

export interface Question {
  id: number;
  dimension: Dimension;
  text: string;
}

export const DIMENSION_ORDER: Dimension[] = ["P", "A", "E", "I"];

export const QUESTIONS: Question[] = [
  // Producer (P)
  {
    id: 1,
    dimension: "P",
    text: "When something needs to be done, I want to start immediately, even before I have all the details.",
  },
  {
    id: 2,
    dimension: "P",
    text: "I would rather do a task myself than delegate it and wait for someone else to finish.",
  },
  {
    id: 3,
    dimension: "P",
    text: "When I take on something, I push through obstacles until it is done.",
  },
  {
    id: 4,
    dimension: "P",
    text: "I feel uncomfortable when I have nothing productive to do.",
  },
  {
    id: 5,
    dimension: "P",
    text: "When someone asks how something is going, I want to show results, not talk about plans.",
  },
  // Administrator (A)
  {
    id: 6,
    dimension: "A",
    text: "Before starting anything, I want to know the full scope, who does what, and how long it takes.",
  },
  {
    id: 7,
    dimension: "A",
    text: "I get frustrated when people skip processes or do things without a plan.",
  },
  {
    id: 8,
    dimension: "A",
    text: "When something goes wrong, my first question is what process failed.",
  },
  {
    id: 9,
    dimension: "A",
    text: "I prefer a clear rule over improvisation, even if the rule is not perfect.",
  },
  {
    id: 10,
    dimension: "A",
    text: "I keep track of details that other people do not even notice.",
  },
  // Entrepreneur (E)
  {
    id: 11,
    dimension: "E",
    text: "I get excited by new ideas, even risky ones, and want to act on them quickly.",
  },
  {
    id: 12,
    dimension: "E",
    text: "When I see an opportunity, I want to move before someone else does.",
  },
  {
    id: 13,
    dimension: "E",
    text: "I enjoy challenging the status quo and finding better ways.",
  },
  {
    id: 14,
    dimension: "E",
    text: "I often think about where I or my business should be in 3 to 5 years.",
  },
  {
    id: 15,
    dimension: "E",
    text: "I would rather try something new and fail than do things the same way forever.",
  },
  // Integrator (I)
  {
    id: 16,
    dimension: "I",
    text: "When two people I know are in conflict, I want to help resolve it.",
  },
  {
    id: 17,
    dimension: "I",
    text: "I notice when someone is stressed or unhappy, even if they do not say it.",
  },
  {
    id: 18,
    dimension: "I",
    text: "I make decisions based on how they affect people, not just outcomes.",
  },
  {
    id: 19,
    dimension: "I",
    text: "People often come to me for advice because they feel heard.",
  },
  {
    id: 20,
    dimension: "I",
    text: "In a group, I care about how everyone gets along, not just what gets done.",
  },
];
