import { PROFILES } from "@/data/profiles";
import type { DimensionResult } from "@/lib/scoring";

export default function ResultCard({
  results,
  code,
  nickname,
}: {
  results: DimensionResult[];
  code: string;
  nickname: string | null;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-white/40">
        Your management style code
      </p>

      <div className="mt-6 flex items-end justify-center gap-1 sm:gap-2">
        {results.map((r, i) => {
          const profile = PROFILES[r.letter];
          const display = r.capital ? r.letter : r.letter.toLowerCase();
          return (
            <span
              key={r.letter}
              className="font-display font-bold leading-none"
              style={{
                fontSize: "clamp(3.5rem, 17vw, 9rem)",
                color: profile.color,
                opacity: r.rank === "Missing" ? 0.25 : r.capital ? 1 : 0.55,
              }}
              title={`${profile.name} — ${r.rank}`}
            >
              {display}
            </span>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {results.map((r) => {
          const profile = PROFILES[r.letter];
          return (
            <span
              key={r.letter}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{
                backgroundColor: `${profile.color}1f`,
                color: profile.color,
              }}
            >
              {profile.name} {r.average.toFixed(1)}
            </span>
          );
        })}
      </div>

      {nickname && (
        <p className="mt-6 font-display text-lg text-white/70">
          Known in pure form as the{" "}
          <span className="font-semibold text-white">{nickname}</span>
        </p>
      )}

      <p className="mt-4 max-w-md text-xs text-white/30">
        {code === code.toLowerCase()
          ? "No dominant dimension — your strengths are spread evenly."
          : "Capital letters are natural strengths. Small letters are present but not natural."}
      </p>
    </div>
  );
}
