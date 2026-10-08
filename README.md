# PAEI Test

A web app that runs a 20-question PAEI assessment and returns your management style code.

PAEI stands for **Producer, Administrator, Entrepreneur, Integrator** — a model by Dr. Ichak Adizes that identifies four management roles. No one is strong in all four. Your code shows where you are strong, where you are present, and where you are weak.

Built for **Future Leaders — Leadership I**. The question set is designed to be relatable for students, young entrepreneurs, and early-stage workers.

## What it does

- **Landing page** — what PAEI is, the four dimensions, how it works
- **Quiz** — 20 questions, one at a time, 1–5 scale, progress bar, no timer
- **Results** — your four-letter code (e.g. `PAei`), per-dimension scores and ranks, strengths and weaknesses, natural conflicts, combination profiles, and share options

## Scoring

Each dimension is the average of its 5 questions:

| Average   | Rank           | Letter        |
| --------- | -------------- | ------------- |
| 4.5 – 5.0 | Very Dominant  | Capital       |
| 3.5 – 4.4 | Dominant       | Capital       |
| 2.5 – 3.4 | Secondary      | Small letter  |
| 1.0 – 2.4 | Missing        | Weak          |

Capital letter = natural strength. Small letter = present but not natural.

## Tech

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** — dark, minimal, mobile-first
- **No backend, no database** — all scoring happens in the browser
- Results are never stored or sent anywhere
- Share as image (generated client-side on a canvas) or as a link (answers encoded in the URL hash)

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build & deploy

```bash
npm run build
npm start
```

Deploys on **Vercel** with zero configuration — connect the repo and every push auto-deploys. No environment variables, no API routes.

## Project structure

```
/app
  page.tsx            Landing page
  quiz/page.tsx       Quiz (one question at a time)
  results/page.tsx    Results + share
  pair/page.tsx       Co-founder pair check
  cohort/page.tsx     Cohort snapshot for teachers
  mentor/page.tsx     Mentor view: rosters, team proposals, course moves
  rate/page.tsx       Rate Your People flow
/components
  QuestionCard.tsx    Question display
  ScaleSelector.tsx   1-5 answer buttons
  ResultCard.tsx      Large four-letter code
  DimensionCard.tsx   Per-dimension breakdown
/data
  questions.ts        The 20 questions
  profiles.ts         Dimension profiles, combinations, conflicts
  perception-questions.ts  16 third-person statements for Rate Your People
/lib
  scoring.ts          Averages, ranks, code, combos, conflicts
  answers.ts          Browser storage + share-link encoding
  perception.ts       16 answers -> perceived code
  compatibility.ts    Two codes -> tier, best-with cards
  pair.ts             Roster parsing + cohort report
  mentor.ts           Mentor cards, team generator, course moves
  rate-session.ts     Rate flow session state
```

## Credits

PAEI model by Dr. Ichak Adizes. Question set and product design by the Future Leaders — Leadership I team.
