"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Attribution from "@/components/Attribution";
import ResultCard from "@/components/ResultCard";
import DimensionCard from "@/components/DimensionCard";
import { PROFILES } from "@/data/profiles";
import {
  answersFromHash,
  clearAnswers,
  loadCompleted,
  loadName,
  nameFromHash,
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
import { buildBestWith } from "@/lib/compatibility";

/** Drop work entries that substantially overlap an earlier (stronger) letter's entry. */
function mergeWorkEntries(entries: string[]): string[] {
  const kept: string[] = [];
  for (const entry of entries) {
    const tokens = new Set(entry.toLowerCase().match(/\w+/g) ?? []);
    const isDup = kept.some((k) => {
      const kt = new Set(k.toLowerCase().match(/\w+/g) ?? []);
      const inter = [...tokens].filter((t) => kt.has(t)).length;
      const union = new Set([...tokens, ...kt]).size;
      return union > 0 && inter / union > 0.55;
    });
    if (!isDup) kept.push(entry);
  }
  return kept;
}

type ShareState = "idle" | "working" | "copied" | "shared" | "error";

/** Draw a shareable result image on a canvas. No external dependencies. */
/**
 * Share image drawn to match the page: same fonts (read from the loaded
 * next/font CSS variables), same letter treatment as ResultCard, same row
 * layout as DimensionCard.
 */
function drawShareImage(
  code: string,
  rows: { letter: string; name: string; score: string; rank: string; color: string }[],
  personName?: string | null
): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas not supported"));

  // Use the same fonts the page renders with.
  const root = getComputedStyle(document.documentElement);
  const displayFamily =
    root.getPropertyValue("--font-space-grotesk").trim() ||
    "'Space Grotesk', system-ui, sans-serif";
  const bodyFamily =
    root.getPropertyValue("--font-inter").trim() ||
    "'Inter', system-ui, sans-serif";
  const display = (weight: number, size: number) =>
    `${weight} ${size}px ${displayFamily}`;
  const body = (weight: number, size: number) =>
    `${weight} ${size}px ${bodyFamily}`;

  const M = 90; // page-like side margin

  // Background
  ctx.fillStyle = "#0a0a0b";
  ctx.fillRect(0, 0, W, H);

  // Top label — same tracking style as the page's small caps labels
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = body(600, 28);
  ctx.textAlign = "center";
  if ("letterSpacing" in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      "8px";
  }
  ctx.fillText("MY PAEI MANAGEMENT STYLE", W / 2, 130);
  if ("letterSpacing" in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      "0px";
  }

  // Tester's name, carried from the share link.
  if (personName) {
    ctx.fillStyle = "#ffffff";
    ctx.font = body(600, 36);
    ctx.textAlign = "center";
    ctx.fillText(personName, W / 2, 185);
  }

  // Big code — ResultCard rules: capital full size/opacity, lowercase smaller
  // and dimmer, missing dimmest.
  const letters = code.split("");
  const rankOf = (ch: string) =>
    rows.find((r) => r.letter.toLowerCase() === ch.toLowerCase())?.rank ?? "";
  const sizeOf = (ch: string) => {
    const rank = rankOf(ch);
    if (rank === "Missing") return 170;
    return ch === ch.toUpperCase() ? 250 : 185;
  };
  const alphaOf = (ch: string) => {
    const rank = rankOf(ch);
    if (rank === "Missing") return 0.25;
    return ch === ch.toLowerCase() ? 0.55 : 1;
  };
  const sizes = letters.map(sizeOf);
  const widths = letters.map((_, i) => {
    ctx.font = display(700, sizes[i]);
    return ctx.measureText(letters[i]).width;
  });
  const gap = 26;
  const totalW = widths.reduce((a, b) => a + b, 0) + gap * (letters.length - 1);
  let x = (W - totalW) / 2;
  const baseline = 480;
  ctx.textAlign = "left";
  letters.forEach((ch, i) => {
    const dim = Object.values(PROFILES).find(
      (p) => p.letter.toLowerCase() === ch.toLowerCase()
    );
    ctx.font = display(700, sizes[i]);
    ctx.fillStyle = dim ? dim.color : "#ffffff";
    ctx.globalAlpha = alphaOf(ch);
    ctx.fillText(ch, x, baseline);
    ctx.globalAlpha = 1;
    x += widths[i] + gap;
  });

  // Chip row under the code — same pills as ResultCard
  ctx.font = body(500, 26);
  const chips = rows.map((r) => `${r.name} ${r.score}`);
  const chipWs = chips.map((c) => ctx.measureText(c).width + 44);
  const chipGap = 14;
  const chipsW = chipWs.reduce((a, b) => a + b, 0) + chipGap * (chips.length - 1);
  let cx = (W - chipsW) / 2;
  const chipY = 545;
  chips.forEach((label, i) => {
    const r = rows[i];
    ctx.fillStyle = `${r.color}26`;
    ctx.beginPath();
    ctx.roundRect(cx, chipY, chipWs[i], 52, 26);
    ctx.fill();
    ctx.fillStyle = r.color;
    ctx.font = body(500, 26);
    ctx.textAlign = "center";
    ctx.fillText(label, cx + chipWs[i] / 2, chipY + 34);
    cx += chipWs[i] + chipGap;
  });

  // Divider
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(M, 665);
  ctx.lineTo(W - M, 665);
  ctx.stroke();

  // Dimension rows — DimensionCard layout: letter chip, name, score, rank
  let y = 745;
  const rowStep = 128;
  ctx.textAlign = "left";
  for (const row of rows) {
    // Letter chip (rounded square, same as page cards)
    ctx.fillStyle = `${row.color}26`;
    ctx.beginPath();
    ctx.roundRect(M, y - 46, 84, 84, 20);
    ctx.fill();
    ctx.fillStyle = row.color;
    ctx.font = display(700, 40);
    ctx.fillText(row.letter, M + 26, y + 10);

    // Name
    ctx.fillStyle = "#ffffff";
    ctx.font = display(600, 34);
    ctx.fillText(row.name, M + 116, y - 2);

    // Rank under name
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = body(400, 24);
    ctx.fillText(row.rank, M + 116, y + 32);

    // Score, right-aligned
    ctx.fillStyle = "#ffffff";
    ctx.font = display(700, 40);
    ctx.textAlign = "right";
    ctx.fillText(row.score, W - M, y + 10);
    ctx.textAlign = "left";

    y += rowStep;
  }

  // Footer
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = body(400, 26);
  ctx.textAlign = "center";
  ctx.fillText(
    "PAEI Test · Future Leaders - Leadership I",
    W / 2,
    H - 70
  );

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
  const [personName, setPersonName] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [shareState, setShareState] = useState<ShareState>("idle");
  const [copiedText, setCopiedText] = useState(false);
  const [copiedReflect, setCopiedReflect] = useState(false);
  const [copiedCoach, setCopiedCoach] = useState(false);
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
    setPersonName(nameFromHash(window.location.hash) ?? loadName());
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
      const blob = await drawShareImage(result.code, shareRows, personName);
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
  }, [result, shareRows, personName]);

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
    lines.push(
      personName
        ? `PAEI code for ${personName}: ${result.code}`
        : `My PAEI code: ${result.code}`
    );
    if (result.nickname) lines.push(`(Pure form: ${result.nickname})`);
    lines.push("");
    for (const r of result.results) {
      const p = PROFILES[r.letter];
      lines.push(
        `${r.capital ? p.letter : p.letter.toLowerCase()} - ${p.name}: ${r.average.toFixed(1)} (${r.rank})`
      );
    }
    lines.push("");
    lines.push(result.summary);
    if (result.combos.length > 0) {
      lines.push("");
      lines.push("Combinations:");
      for (const { combo } of result.combos) {
        lines.push(`• ${combo.letters} - ${combo.name}: ${combo.description}`);
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
    lines.push("- Taken with the PAEI Test");
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

  // A1: all dominant letters, strongest first; fall back to strongest lean
  // when nothing is dominant so the card still exists.
  const dominantLetters = useMemo(() => {
    if (!result) return [];
    const doms = result.results
      .filter((r) => r.capital)
      .sort((a, b) => b.average - a.average)
      .map((r) => r.letter);
    if (doms.length > 0) return doms;
    return strongest ? [strongest.letter] : [];
  }, [result, strongest]);

  const hasDominant = useMemo(
    () => result?.results.some((r) => r.capital) ?? false,
    [result]
  );

  const workSections = useMemo(() => {
    if (!result || dominantLetters.length === 0) return [];
    const labels: Record<string, string> = {
      feedback: "Feedback",
      delegate: "Delegation",
      pitch: "Pitching ideas",
      need: "What I need",
    };
    return (["feedback", "delegate", "pitch", "need"] as const).map((key) => ({
      key,
      label: labels[key],
      entries: mergeWorkEntries(
        dominantLetters.map((l) => PROFILES[l].work[key])
      ),
    }));
  }, [result, dominantLetters]);

  // A2: best complements + friction profile.
  const bestWith = useMemo(() => {
    if (!result) return [];
    return buildBestWith(result.results);
  }, [result]);

  const handleCopyReflection = useCallback(async () => {
    if (!result || !weakest) return;
    const p = PROFILES[weakest.letter];
    const lines: string[] = [
      `Reflection - my ${p.name} (${weakest.letter}) is ${weakest.average.toFixed(1)} (${weakest.rank})`,
      "",
      `Why this score: ${p.why}`,
      "",
      "Reflection questions:",
      ...p.reflection.map((q, i) => `${i + 1}. ${q}`),
      "",
      "Practices I want to try:",
      ...p.improve.map((s, i) => `${i + 1}. ${s}`),
      "",
      "My notes:",
      "",
      "",
      "",
      "- Weekly report, Future Leaders - Leadership I",
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopiedReflect(true);
    } catch {
      window.prompt("Copy your reflection prompts:", lines.join("\n"));
    }
    setTimeout(() => setCopiedReflect(false), 2500);
  }, [result, weakest]);

  // Full-context coaching prompt — paste into ChatGPT/Claude and it can
  // discuss, ask follow-ups, and help write the report entry.
  const handleCopyCoach = useCallback(async () => {
    if (!result || !weakest) return;
    const p = PROFILES[weakest.letter];
    const lines: string[] = [
      "Coaching prompt - my PAEI growth edge",
      "",
      `Context: I am ${personName ? `${personName}, ` : ""}a student in Future Leaders - Leadership I. I took the PAEI assessment (management roles: Producer, Administrator, Entrepreneur, Integrator).`,
      "",
      `My code: ${result.code}`,
      ...result.results.map((r) => {
        const dp = PROFILES[r.letter];
        return `${dp.letter} - ${dp.name}: ${r.average.toFixed(1)} (${r.rank})`;
      }),
      "",
      `My lowest dimension: ${p.name} (${weakest.average.toFixed(1)} - ${weakest.rank}).`,
      `Why this score: ${p.why}`,
      "",
      "Questions to reflect on:",
      ...p.reflection.map((q, i) => `${i + 1}. ${q}`),
      "",
      "Practices I am considering:",
      ...p.improve.map((s, i) => `${i + 1}. ${s}`),
      "",
      "Please coach me on this dimension: ask me one question at a time to help me understand my score, reflect honestly, and choose one practice to commit to this week. After we have discussed, help me write 3-4 sentences I can paste into my weekly report.",
    ];
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCoach(true);
    } catch {
      window.prompt("Copy the coaching prompt:", text);
    }
    setTimeout(() => setCopiedCoach(false), 2500);
  }, [result, weakest]);

  const handleCopyWork = useCallback(async () => {
    if (!result || workSections.length === 0) return;
    const names = dominantLetters
      .map((l) => PROFILES[l].name)
      .join(" and ");
    const lines: string[] = [
      `How to work with me — ${result.code}`,
      hasDominant
        ? `I lead through ${names}.`
        : `No dominant dimension — my closest lean is ${names}.`,
      "",
    ];
    for (const section of workSections) {
      for (const entry of section.entries) {
        lines.push(`${section.label}: ${entry}`);
      }
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopiedWork(true);
    } catch {
      window.prompt("Copy your work style card:", lines.join("\n"));
    }
    setTimeout(() => setCopiedWork(false), 2500);
  }, [result, workSections, dominantLetters, hasDominant]);

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
          name={personName}
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
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/50 hover:text-white"
        >
          Download PDF
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
          <p className="mt-2 text-sm text-white/50">
            {PROFILES[weakest.letter].name} is your lowest dimension (
            {weakest.average.toFixed(1)} - {weakest.rank}). Understand why,
            then pick one thing to practice.
          </p>

          {/* Why this score */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/45">
              Why this score
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              {PROFILES[weakest.letter].why}
            </p>
          </div>

          {/* How to improve */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/45">
              How to improve
            </h3>
            <ul className="mt-3 space-y-2.5">
              {PROFILES[weakest.letter].improve.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-display text-xs font-bold"
                    style={{
                      backgroundColor: `${PROFILES[weakest.letter].color}26`,
                      color: PROFILES[weakest.letter].color,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-white/70">
                    {s}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Reflection questions */}
          <ol className="mt-4 space-y-4">
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
                <p className="text-sm leading-relaxed text-white/70">{q}</p>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCopyCoach}
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              {copiedCoach ? "Copied ✓" : "Copy coaching prompt"}
            </button>
            <button
              type="button"
              onClick={handleCopyReflection}
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/50 hover:text-white"
            >
              {copiedReflect ? "Copied ✓" : "Copy for my report"}
            </button>
          </div>
          <p className="mt-3 text-xs text-white/40">
            Coaching prompt includes your full score context: paste it into
            ChatGPT or Claude to discuss this dimension, or answer the
            questions yourself first.
          </p>
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

      {/* Who I work best with */}
      {bestWith.length > 0 && (
        <section className="border-t border-white/10 py-10">
          <h2 className="font-display text-xl font-semibold text-white">
            Who I work best with
          </h2>
          <p className="mt-2 text-sm text-white/45">
            The people who complete your profile, and the one who collides
            with it.
          </p>
          {!hasDominant && (
            <p className="mt-3 text-sm leading-relaxed text-white/40">
              No dominant dimension means no default seat: you are still
              deciding where you fit. That is an advantage in a startup: you
              can plug into whichever role the team is missing. Try leaning
              into one dimension for a semester and see which seat feels like
              yours.
            </p>
          )}
          <div className="mt-6 space-y-4">
            {bestWith.map((card) => (
              <div
                key={card.kind + card.letters}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-display text-2xl font-bold text-white">
                    {card.letters}
                  </span>
                  <span className="font-display text-lg font-semibold text-white/80">
                    {card.title}
                  </span>
                  <span className="ml-auto rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] text-white/45 ring-1 ring-white/10">
                    {card.badge}
                  </span>
                </div>
                <div className="mt-3 space-y-1.5">
                  {card.lines.map((line, i) => (
                    <p key={i} className="text-sm leading-relaxed text-white/55">
                      {line}
                    </p>
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  <span className="font-medium text-white/80">
                    How to work with them:{" "}
                  </span>
                  {card.workLine}
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
          Roles your natural strengths point toward, drawn from your dominant
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
                No dominant dimension means no default seat: you are still
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
      {workSections.length > 0 && (
        <section className="border-t border-white/10 py-10">
          <h2 className="font-display text-xl font-semibold text-white">
            How to work with me
          </h2>
          <p className="mt-2 text-sm text-white/45">
            {hasDominant
              ? `Generated from your dominant dimensions: ${dominantLetters
                  .map((l) => PROFILES[l].name)
                  .join(", ")}.`
              : `No dominant dimension: generated from your closest lean, ${
                  PROFILES[dominantLetters[0]].name
                } (${strongest!.average.toFixed(1)}).`}{" "}
            Share this with teammates so they know what works on you.
          </p>
          <div className="mt-6 space-y-3">
            {workSections.map((section) => (
              <div
                key={section.key}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  {section.label}
                </p>
                <div className="mt-1.5 space-y-1.5">
                  {section.entries.map((entry, i) => (
                    <p key={i} className="text-sm leading-relaxed text-white/65">
                      {entry}
                    </p>
                  ))}
                </div>
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
                    <span className="text-xs text-white/45">vs</span>
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
          Based on the PAEI model by Dr. Ichak Adizes. Built for Future Leaders -
          Leadership I.
        </p>
        <p className="mt-1 text-xs text-white/45">
          Results are shown to you only: nothing is stored on a server.
        </p>
        <div className="mt-4">
          <Attribution />
        </div>
      </footer>
    </main>
  );
}
