import type { DimensionResult } from "@/lib/scoring";

const KEY = "paei-rate-v1";

export interface RatedPerson {
  name: string;
  /** 16 perception answers, by question index. */
  answers: number[];
  perceivedCode: string;
}

export interface RateSession {
  raterName: string;
  ownCode: string;
  ownSource: "test" | "manual";
  /** Names queued to rate. */
  people: string[];
  /** Completed ratings. */
  rated: RatedPerson[];
  /** Person currently being quizzed (null between people). */
  draftName: string | null;
  /** Partial answers for the current person (null if none started). */
  draftAnswers: number[] | null;
  /** Display order for the current person's questions. */
  draftOrder: number[] | null;
}

export function emptySession(): RateSession {
  return {
    raterName: "",
    ownCode: "",
    ownSource: "test",
    people: [],
    rated: [],
    draftName: null,
    draftAnswers: null,
    draftOrder: null,
  };
}

export function loadRateSession(): RateSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RateSession>;
    if (typeof parsed.raterName !== "string") return null;
    return { ...emptySession(), ...parsed } as RateSession;
  } catch {
    return null;
  }
}

export function saveRateSession(session: RateSession): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KEY, JSON.stringify(session));
}

export function clearRateSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(KEY);
}

/** Perceived results are recomputed from stored answers — never trusted from storage. */
export function perceivedResultsOf(
  person: RatedPerson,
  compute: (answers: number[]) => DimensionResult[]
): DimensionResult[] {
  return compute(person.answers);
}
