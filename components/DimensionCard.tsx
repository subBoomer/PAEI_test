import { PROFILES } from "@/data/profiles";
import type { DimensionResult } from "@/lib/scoring";
import { rankTone } from "@/lib/scoring";

export default function DimensionCard({
  result,
}: {
  result: DimensionResult;
}) {
  const profile = PROFILES[result.letter];
  const pct = Math.round((result.average / 5) * 100);

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-2xl font-display text-3xl font-bold"
            style={{
              backgroundColor: `${profile.color}26`,
              color: profile.color,
            }}
          >
            {result.capital ? profile.letter : profile.letter.toLowerCase()}
          </span>
          <div>
            <h3 className="font-display text-lg font-semibold text-white">
              {profile.name}
            </h3>
            <p className="text-xs text-white/40">{profile.nickname}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-bold text-white">
            {result.average.toFixed(1)}
          </p>
          <p className="text-[10px] text-white/30">out of 5.0</p>
        </div>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor:
              result.rank === "Missing" ? "rgba(255,255,255,0.2)" : profile.color,
          }}
        />
      </div>

      <div className="mt-3">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${rankTone(
            result.rank
          )}`}
        >
          {result.rank}
        </span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-white/60">
        {profile.meaning}
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400/80">
            Strengths
          </h4>
          <ul className="mt-2 space-y-1.5">
            {profile.strengths.map((s) => (
              <li key={s} className="text-sm text-white/60">
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-400/80">
            Watch-outs
          </h4>
          <ul className="mt-2 space-y-1.5">
            {profile.weaknesses.map((w) => (
              <li key={w} className="text-sm text-white/60">
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40">
          Where this shows up in a startup
        </h4>
        <ul className="mt-2 space-y-1.5">
          {profile.roles.map((r) => (
            <li key={r} className="text-sm text-white/60">
              {r}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
