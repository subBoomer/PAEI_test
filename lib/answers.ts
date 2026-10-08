const STORAGE_KEY = "paei-answers-v1";
const ORDER_KEY = "paei-order-v1";
const NAME_KEY = "paei-name-v1";
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
  // Clear the question order too, so a retake gets a fresh shuffle.
  window.sessionStorage.removeItem(ORDER_KEY);
}

/**
 * The display order for the quiz: indices into QUESTIONS.
 * Answers are always stored by question index, never by display position,
 * so shuffling never affects scoring or share links.
 */
export function loadOrder(): number[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ORDER_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== ANSWER_COUNT) return null;
    if (
      !parsed.every(
        (n) => Number.isInteger(n) && n >= 0 && n < ANSWER_COUNT
      )
    )
      return null;
    if (new Set(parsed).size !== ANSWER_COUNT) return null;
    return parsed as number[];
  } catch {
    return null;
  }
}

export function saveOrder(order: number[]): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ORDER_KEY, JSON.stringify(order));
}

/** The tester's name. Travels inside share links so mentors see who is who. */
export function loadName(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(NAME_KEY);
  return raw && raw.length > 0 ? raw : null;
}

export function saveName(name: string): void {
  if (typeof window === "undefined") return;
  const trimmed = name.slice(0, 40);
  if (trimmed) window.sessionStorage.setItem(NAME_KEY, trimmed);
  else window.sessionStorage.removeItem(NAME_KEY);
}

/** Extract a name carried in a share-link hash: #paei=...&n=Marijs */
export function nameFromHash(hash: string): string | null {
  const m = /[?&#]n=([^&]+)/.exec(hash);
  if (!m) return null;
  try {
    const decoded = decodeURIComponent(m[1]).trim();
    return decoded && decoded.length <= 40 ? decoded : null;
  } catch {
    return null;
  }
}

/** Fisher–Yates shuffle over question indices 0..19. */
export function shuffledOrder(): number[] {
  const order = Array.from({ length: ANSWER_COUNT }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function answersFromHash(hash: string): number[] | null {
  const match = /paei=([0-5]{20})/.exec(hash);
  if (!match) return null;
  return normalizeAnswers(match[1]);
}

export function shareUrl(answers: number[]): string {
  if (typeof window === "undefined") return "";
  const base = `${window.location.origin}/results#paei=${answers.join("")}`;
  const name = loadName();
  return name ? `${base}&n=${encodeURIComponent(name)}` : base;
}
