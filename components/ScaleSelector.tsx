"use client";

const LABELS = ["Never", "Rarely", "Sometimes", "Often", "Always"];

interface ScaleSelectorProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export default function ScaleSelector({
  value,
  onChange,
  disabled = false,
}: ScaleSelectorProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              aria-pressed={selected}
              aria-label={`${n} — ${LABELS[n - 1]}`}
              disabled={disabled}
              onClick={() => onChange(n)}
              className={[
                "flex aspect-square sm:aspect-[4/3] flex-col items-center justify-center rounded-2xl border transition-all duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0b]",
                selected
                  ? "scale-[1.04] border-white bg-white text-black shadow-lg shadow-white/10"
                  : "border-white/15 bg-white/[0.04] text-white/80 hover:border-white/40 hover:bg-white/[0.08]",
                disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
              ].join(" ")}
            >
              <span className="font-display text-xl font-bold sm:text-2xl">
                {n}
              </span>
              <span
                className={[
                  // Word labels only from sm up — on phones the legend
                  // "1 = never · 5 = always" below carries the meaning,
                  // and "Sometimes" would overflow a ~48px button.
                  "mt-0.5 hidden text-[10px] font-medium sm:block sm:text-xs",
                  selected ? "text-black/60" : "text-white/40",
                ].join(" ")}
              >
                {LABELS[n - 1]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
