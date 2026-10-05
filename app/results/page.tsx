"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ResultCard from "@/components/ResultCard";
import DimensionCard from "@/components/DimensionCard";
import { PROFILES } from "@/data/profiles";
import {
  answersFromHash,
  clearAnswers,
  loadCompleted,
  saveAnswers,
  shareUrl,
} from "@/lib/answers";
import {
  buildCode,
  buildSummary,
  computeResults,
  findConflicts,
  matchCombinations,
  uniqueDominant,
} from "@/lib/scoring";

type ShareState = "idle" | "working" | "copied" | "shared" | "error";

/** Draw a shareable result image on a canvas. No external dependencies. */
function drawShareImage(
  code: string,
  rows: { letter: string; name: string; score: string; rank: string; color: string }[]
): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas not supported"));

  // Background
  ctx.fillStyle = "#0a0a0b";
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "600 32px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MY PAEI MANAGEMENT STYLE", W / 2, 130);

  // Big code — draw each letter in its dimension color
  const letters = code.split("");
  const sizes = letters.map((ch) => (ch === ch.toUpperCase() ? 260 : 190));
  const widths = letters.map((_, i) => {
    ctx.font = `700 ${sizes[i]}px system-ui, sans-serif`;
    return ctx.measureText(letters[i]).width;
  });
  const gap = 24;
  const totalW = widths.reduce((a, b) => a + b, 0) + gap * (letters.length - 1);
  let x = (W - totalW) / 2;
  const baseline = 520;
  letters.forEach((ch, i) => {
    const dim = Object.values(PROFILES).find(
      (p) => p.letter.toLowerCase() === ch.toLowerCase()
    );
    ctx.font = `700 ${sizes[i]}px system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillStyle = dim ? dim.color : "#ffffff";
    ctx.globalAlpha = ch === ch.toLowerCase() ? 0.5 : 1;
    ctx.fillText(ch, x, baseline);
    ctx.globalAlpha = 1;
    x += widths[i] + gap;
  });

  // Dimension rows
  let y = 700;
  ctx.textAlign = "left";
  for (const row of rows) {
    // Letter chip
    ctx.fillStyle = `${row.color}33`;
    ctx.beginPath();
    ctx.roundRect(90, y - 55, 80, 80, 18);
    ctx.fill();
    ctx.fillStyle = row.color;
    ctx.font = "700 44px system-ui, sans-serif";
    ctx.fillText(row.letter, 118, y);

    // Name
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 36px system-ui, sans-serif";
    ctx.fillText(row.name, 210, y - 8);

    // Rank + score
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "400 28px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${row.rank} · ${row.score}`, W - 90, y - 8);
    ctx.textAlign = "left";

    y += 140;
  }

  // Footer
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "400 28px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Take the PAEI Test — 20 questions, one four-letter code", W / 2, H - 80);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to create image"));
    }, "image/png");
  });
}

export default function ResultsPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<number[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [shareState, setShareState] = useState<ShareState>("idle");
  const [copiedText, setCopiedText] = useState(false);
  const [copiedReflect, setCopiedReflect] = useState(false);
  const [copiedWork, setCopiedWork] = useState(false);
  const shareUrlRef = useRef("");

  useEffect(() => {
    // Shared link takes priority, then session.
    const fromHash = answersFromHash(window.location.hash);
    const fromSession = loadCompleted();
    const resolved = fromHash ?? fromSession;
    if (!resolved) {
      setMissing(true);
      return;
    }
    if (fromHash) saveAnswers(fromHash);
    setAnswers(resolved);
  }, []);

  const result = useMemo(() => {
    if (!answers) return null;
    const results = computeResults(answers);
    const code = buildCode(results);
    const combos = matchCombinations(results);
    const conflicts = findConflicts(results);
    const summary = buildSummary(results, combos, code);
    const sole = uniqueDominant(results);
    return {
      results,
      code,
      combos,
      conflicts,
      summary,
      nickname: sole ? PROFILES[sole].nickname : null,
    };
  }, [answers]);

  const shareRows = useMemo(() => {
    if (!result) return [];
    return result.results.map((r) => {
      const p = PROFILES[r.letter];
      return {
        letter: r.capital ? p.letter : p.letter.toLowerCase(),
        name: p.name,
        score: r.average.toFixed(1),
        rank: r.rank,
        color: p.color,
      };
    });
  }, [result]);

  useEffect(() => {
    if (answers) shareUrlRef.current = shareUrl(answers);
  }, [answers]);

  const handleShareImage = useCallback(async () => {
    if (!result) return;
    setShareState("working");
    try {
      const blob = await drawShareImage(result.code, shareRows);
      const file = new File([blob], `paei-${result.code}.png`, {
        type: "image/png",
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `My PAEI code is ${result.code}` });
        setShareState("shared");
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        setShareState("shared");
      }
    } catch {
      setShareState("error");
    }
    setTimeout(() => setShareState("idle"), 2500);
  }, [result, shareRows]);

  const handleShareLink = useCallback(async () => {
    if (!shareUrlRef.current) return;
    setShareState("working");
    try {
      await navigator.clipboard.writeText(shareUrlRef.current);
      setShareState("copied");
    } catch {
      setShareState("error");
    }
    setTimeout(() => setShareState("idle"), 2500);
  }, []);

  const handleCopyResults = useCallback(async () => {
    if (!result) return;
    const lines: string[] = [];
    lines.push(`My PAEI code: ${result.code}`);
    if (result.nickname) lines.push(`(Pure form: ${result.nickname})`);
    lines.push("");
    for (const r of result.results) {
      const p = PROFILES[r.letter];
      lines.push(
        `${r.capital ? p.letter : p.letter.toLowerCase()} — ${p.name}: ${r.average.toFixed(1)} (${r.rank})`
      );
    }
    lines.push("");
    lines.push(result.summary);
    if (result.combos.length > 0) {
      lines.push("");
      lines.push("Combinations:");
      for (const { combo } of result.combos) {
        lines.push(`• ${combo.letters} — ${combo.name}: ${combo.description}`);
      }
    }
    if (result.conflicts.length > 0) {
      lines.push("");
      lines.push("Natural conflicts:");
      for (const { conflict, kind } of result.conflicts) {
        lines.push(
          `• ${conflict.a}-${conflict.b} ${conflict.title} (${kind})`
        );
      }
    }
    lines.push("");
    lines.push("— Taken with the PAEI Test");
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopiedText(true);
    } catch {
      // Clipboard blocked — fall back to a prompt so the text is still reachable.
      window.prompt("Copy your results:", lines.join("\n"));
    }
    setTimeout(() => setCopiedText(false), 2500);
  }, [result]);

  // Weakest dimension → reflection prompts. Strongest → how-to-work card.
  const weakest = useMemo(() => {
    if (!result) return null;
    return [...result.results].sort((a, b) => a.average - b.average)[0];
  }, [result]);

  const strongest = useMemo(() => {
    if (!result) return null;
    return [...result.results].sort((a, b) => b.average - a.average)[0];
  }, [result]);

  const handleCopyReflection = useCallback(async () => {
    if (!result || !weakest) return;
    const p = PROFILES[weakest.letter];
    const lines: string[] = [
      `Reflection — my ${p.name} (${weakest.letter}) is ${weakest.average.toFixed(1)} (${weakest.rank})`,
      "",
      ...p.reflection.map((q, i) => `${i + 1}. ${q}`),
      "",
      "My notes:",
      "",
      "",
      "",
      "— Weekly report, Future Leaders — Leadership I",
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopiedReflect(true);
    } catch {
      window.prompt("Copy your reflection prompts:", lines.join("\n"));
    }
    setTimeout(() => setCopiedReflect(false), 2500);
  }, [result, weakest]);

  const handleCopyWork = useCallback(async () => {
    if (!result || !strongest) return;
    const p = PROFILES[strongest.letter];
    const lines: string[] = [
      `How to work with me — ${result.code}`,
      `I lead through ${p.name}.`,
      "",
      `Feedback: ${p.work.feedback}`,
      `Delegation: ${p.work.delegate}`,
      `Pitching ideas: ${p.work.pitch}`,
      `What I need: ${p.work.need}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopiedWork(true);
    } catch {
      window.prompt("Copy your work style card:", lines.join("\n"));
    }
    setTimeout(() => setCopiedWork(false), 2500);
  }, [result, strongest]);

  if (missing) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-3xl font-bold text-white">
          No results found
        </h1>
        <p className="mt-3 text-white/50">
          Take the 20-question test and your code will appear here.
        </p>
        <Link
          href="/quiz"
          className="mt-8 rounded-full bg-white px-8 py-4 font-display font-semibold text-black transition-transform hover:scale-[1.03]"
        >
          Start the test
        </Link>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-white/40">Loading…</p>
      </main>
    );
  }

  const shareLabel =
    shareState === "working"
      ? "Working…"
      : shareState === "copied"
      ? "Link copied ✓"
      : shareState === "shared"
      ? "Shared ✓"
      : shareState === "error"
      ? "Something went wrong"
      : "Share as image";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <Link
          href="/"
          className="text-sm text-white/50 transition-colors hover:text-white"
        >
          ← Home
        </Link>
        <span className="font-display text-sm font-medium text-white/60">
          PAEI
        </span>
      </header>

      {/* Big code */}
      <section className="fade-up py-10">
        <ResultCard
          results={result.results}
          code={result.code}
          nickname={result.nickname}
        />
      </section>

      {/* Share + actions */}
      <section className="flex flex-wrap items-center justify-center gap-3 pb-12">
        <button
          type="button"
          onClick={handleShareImage}
          disabled={shareState === "working"}
          className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:opacity-60"
        >
          {shareLabel}
        </button>
        <button
          type="button"
          onClick={handleShareLink}
          className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/50 hover:text-white"
        >
          {shareState === "copied" ? "Copied ✓" : "Copy result link"}
        </button>
        <button
          type="button"
          onClick={handleCopyResults}
          className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/50 hover:text-white"
        >
          {copiedText ? "Copied ✓" : "Copy results"}
        </button>
        <Link
          href="/quiz"
          onClick={() => clearAnswers()}
          className="rounded-full border border-white/10 px-6 py-3 text-sm text-white/50 transition-colors hover:text-white"
        >
          Retake
        </Link>
      </section>

      {/* Summary */}
      <section className="border-t border-white/10 py-10">
        <h2 className="font-display text-xl font-semibold text-white">
          What your code means
        </h2>
        <p className="mt-4 leading-relaxed text-white/65">{result.summary}</p>
      </section>

      {/* Reflection */}
      {weakest && (
        <section className="border-t border-white/10 py-10">
          <h2 className="font-display text-xl font-semibold text-white">
            Reflect on your growth edge
          </h2>
          <p className="mt-2 text-sm text-white/45">
            {PROFILES[weakest.letter].name} is your lowest dimension (
            {weakest.average.toFixed(1)} — {weakest.rank}). Three questions for
            your weekly report or journal.
          </p>
          <ol className="mt-6 space-y-4">
            {PROFILES[weakest.letter].reflection.map((q, i) => (
              <li
                key={i}
                className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold"
                  style={{
                    backgroundColor: `${PROFILES[weakest.letter].color}26`,
                    color: PROFILES[weakest.letter].color,
                  }}
                >
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-white/65">{q}</p>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={handleCopyReflection}
            className="mt-6 rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/50 hover:text-white"
          >
            {copiedReflect ? "Copied ✓" : "Copy prompts for my report"}
          </button>
        </section>
      )}

      {/* Dimensions */}
      <section className="border-t border-white/10 py-10">
        <h2 className="font-display text-xl font-semibold text-white">
          Your four dimensions
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {result.results.map((r) => (
            <DimensionCard key={r.letter} result={r} />
          ))}
        </div>
      </section>

      {/* Combinations */}
      {result.combos.length > 0 && (
        <section className="border-t border-white/10 py-10">
          <h2 className="font-display text-xl font-semibold text-white">
            Your combinations
          </h2>
          <p className="mt-2 text-sm text-white/45">
            The strongest patterns in your profile.
          </p>
          <div className="mt-6 space-y-4">
            {result.combos.map(({ combo, fit }) => (
              <div
                key={combo.letters}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-display text-2xl font-bold text-white">
                    {combo.letters}
                  </span>
                  <span className="font-display text-lg font-semibold text-white/80">
                    {combo.name}
                  </span>
                  <span className="ml-auto rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] text-white/45 ring-1 ring-white/10">
                    {fit}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-white/55">
                  {combo.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Startup fit */}
      <section className="border-t border-white/10 py-10">
        <h2 className="font-display text-xl font-semibold text-white">
          Where you fit in a startup
        </h2>
        <p className="mt-2 text-sm text-white/45">
          Roles your natural strengths point toward — drawn from your dominant
          dimensions.
        </p>
        <div className="mt-6 space-y-4">
          {result.results
            .filter((r) => r.capital)
            .map((r) => {
              const p = PROFILES[r.letter];
              return (
                <div
                  key={r.letter}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl font-display text-xl font-bold"
                      style={{
                        backgroundColor: `${p.color}26`,
                        color: p.color,
                      }}
                    >
                      {p.letter}
                    </span>
                    <div>
                      <h3 className="font-display text-base font-semibold text-white">
                        {p.name}
                      </h3>
                      <p className="text-xs text-white/40">
                        {r.rank} · {r.average.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-1.5">
                    {p.roles.map((role) => (
                      <li key={role} className="text-sm text-white/60">
                        {role}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          {result.results.every((r) => !r.capital) && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-sm leading-relaxed text-white/60">
                No dominant dimension means no default seat — you are still
                deciding where you fit. That is an advantage in a startup: you
                can plug into whichever role the team is missing. Try leaning
                into one dimension for a semester and see which seat feels like
                yours.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* How to work with me */}
      {strongest && (
        <section className="border-t border-white/10 py-10">
          <h2 className="font-display text-xl font-semibold text-white">
            How to work with me
          </h2>
          <p className="mt-2 text-sm text-white/45">
            Generated from your strongest dimension — {PROFILES[strongest.letter].name} (
            {strongest.average.toFixed(1)}). Share this with teammates so they
            know what works on you.
          </p>
          <div className="mt-6 space-y-3">
            {(
              [
                ["Feedback", "feedback"],
                ["Delegation", "delegate"],
                ["Pitching ideas", "pitch"],
                ["What I need", "need"],
              ] as const
            ).map(([label, key]) => (
              <div
                key={key}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  {label}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/65">
                  {PROFILES[strongest.letter].work[key]}
                </p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleCopyWork}
            className="mt-6 rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/50 hover:text-white"
          >
            {copiedWork ? "Copied ✓" : "Copy work style card"}
          </button>
        </section>
      )}

      {/* Conflicts */}
      {result.conflicts.length > 0 && (
        <section className="border-t border-white/10 py-10">
          <h2 className="font-display text-xl font-semibold text-white">
            Natural conflicts
          </h2>
          <p className="mt-2 text-sm text-white/45">
            Dimensions that pull against each other in your profile. This is
            where your internal tension lives.
          </p>
          <div className="mt-6 space-y-4">
            {result.conflicts.map(({ conflict, kind }) => {
              const pa = PROFILES[conflict.a];
              const pb = PROFILES[conflict.b];
              return (
                <div
                  key={`${conflict.a}-${conflict.b}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-lg px-2 py-0.5 font-display text-sm font-bold"
                      style={{
                        backgroundColor: `${pa.color}26`,
                        color: pa.color,
                      }}
                    >
                      {pa.letter}
                    </span>
                    <span className="text-xs text-white/30">vs</span>
                    <span
                      className="rounded-lg px-2 py-0.5 font-display text-sm font-bold"
                      style={{
                        backgroundColor: `${pb.color}26`,
                        color: pb.color,
                      }}
                    >
                      {pb.letter}
                    </span>
                    <span className="ml-2 font-display text-base font-semibold text-white">
                      {conflict.title}
                    </span>
                    <span className="ml-auto rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] text-white/45 ring-1 ring-white/10">
                      {kind}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-white/55">
                    {conflict.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <footer className="border-t border-white/10 py-10">
        <p className="text-sm text-white/40">
          Based on the PAEI model by Dr. Ichak Adizes. Built for Future Leaders —
          Leadership I.
        </p>
        <p className="mt-1 text-xs text-white/30">
          Results are shown to you only — nothing is stored on a server.
        </p>
      </footer>
    </main>
  );
}
