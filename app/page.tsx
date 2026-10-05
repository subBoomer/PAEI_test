import Link from "next/link";
import { DIMENSION_ORDER } from "@/data/questions";
import { PROFILES } from "@/data/profiles";

const SHORT: Record<string, string> = {
  P: "Gets it done. Results first, always.",
  A: "Builds the system behind the results.",
  E: "Sees the future and moves first.",
  I: "Holds the people — and the culture — together.",
};

const STEPS = [
  {
    title: "Answer 20 questions",
    body: "Five questions per dimension. Answer honestly — there are no right answers, and no timer.",
  },
  {
    title: "Get your four-letter code",
    body: "Each dimension is scored and ranked. Capital letter means natural strength. Small letter means present but not natural.",
  },
  {
    title: "See the whole picture",
    body: "Your strengths, your blind spots, the combinations that define you, and the natural conflicts inside your profile.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <span className="font-display text-sm font-medium tracking-wide text-white/60">
          PAEI
        </span>
        <Link
          href="/quiz"
          className="text-sm text-white/60 transition-colors hover:text-white"
        >
          Take the test
        </Link>
      </header>

      <section className="flex flex-1 flex-col justify-center py-16 sm:py-24">
        <p className="fade-up text-sm font-medium uppercase tracking-[0.2em] text-white/40">
          Future Leaders · Leadership I
        </p>
        <h1 className="fade-up mt-4 font-display text-6xl font-bold tracking-tight text-white sm:text-8xl">
          PAEI Test
        </h1>
        <p className="fade-up mt-6 max-w-2xl text-lg leading-relaxed text-white/60 sm:text-xl">
          No one is strong in all four. This assessment shows where you lead as
          a Producer, Administrator, Entrepreneur, and Integrator — and where
          you don&apos;t. Twenty questions. One four-letter code.
        </p>
        <div className="fade-up mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/quiz"
            className="rounded-full bg-white px-8 py-4 font-display text-base font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Start the test
          </Link>
          <span className="text-sm text-white/40">
            20 questions · ~3 minutes · no signup
          </span>
        </div>
      </section>

      <section className="border-t border-white/10 py-16">
        <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
          The four dimensions
        </h2>
        <p className="mt-3 max-w-2xl text-white/50">
          Based on the PAEI management model by Dr. Ichak Adizes. Each of us has
          all four — in different amounts.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {DIMENSION_ORDER.map((letter) => {
            const p = PROFILES[letter];
            return (
              <div
                key={letter}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <div className="flex items-center gap-4">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-display text-2xl font-bold"
                    style={{
                      backgroundColor: `${p.color}26`,
                      color: p.color,
                    }}
                  >
                    {p.letter}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-white">
                      {p.name}
                    </h3>
                    <p className="text-sm text-white/50">{SHORT[letter]}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-t border-white/10 py-16">
        <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
          How it works
        </h2>
        <ol className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <span
                className="font-display text-sm font-semibold"
                style={{ color: ["#f59e0b", "#3b82f6", "#a855f7"][i] }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 font-display text-lg font-semibold text-white">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-white/10 py-10">
        <p className="text-sm text-white/40">
          Based on the PAEI model by Dr. Ichak Adizes. Built for Future Leaders —
          Leadership I.
        </p>
        <p className="mt-1 text-sm text-white/30">
          Results stay in your browser. Nothing is stored or sent anywhere.
        </p>
      </footer>
    </main>
  );
}
