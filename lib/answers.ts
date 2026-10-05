const STORAGE_KEY = "paei-answers-v1";
export const ANSWER_COUNT = 20;

/** Strict: exactly 20 answers, each 1-5. */
export function normalizeAnswers(raw: string | null | undefined): number[] | null {
  if (!raw || !/^[1-5]{20}$/.test(raw)) return null;
  return raw.split("").map(Number);
}

/** Loose: 20 slots of 0-5 (0 = unanswered). Used by the quiz to resume. */
export function loadPartial(): number[] | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw || !/^[0-5]{20}$/.test(raw)) return null;
  return raw.split("").map(Number);
}

/** Only a fully completed set (every answer 1-5). */
export function loadCompleted(): number[] | null {
  if (typeof window === "undefined") return null;
  return normalizeAnswers(window.sessionStorage.getItem(STORAGE_KEY));
}

export function saveAnswers(answers: number[]): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, answers.join(""));
}

export function clearAnswers(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function answersFromHash(hash: string): number[] | null {
  const match = /paei=([0-5]{20})/.exec(hash);
  if (!match) return null;
  return normalizeAnswers(match[1]);
}

export function shareUrl(answers: number[]): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/results#paei=${answers.join("")}`;
}
