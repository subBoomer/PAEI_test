# PAEI App Update: Crash Course Edition — Agent Prompt

## What We Are Building

Two updates to the existing PAEI app:

- **Update A** — Results page completes itself: "How to work with me" for ALL dominant letters (not just the strongest one), plus a new **"Who I work best with"** section — best-fit and friction profiles with concrete reasons and how to work with them.
- **Update B** — A new tool, **"Rate Your People"** (`/rate`): one person rates people they know and gets their perceived code, compatibility with the rater, and where each side lacks.

## Why

The app now powers a 45-minute crash course, "How You Lead", for Future Leaders — Leadership I. Small room, on-site, live. The flow:

1. Timur talks — leadership theory
2. **Practical 1** — everyone takes the test, then analyzes themselves in the app: what I am, how I work, how to work with me, pros and cons, who I work best with and why. Update A carries this.
3. Timur talks — teams, complementarity, conflicts
4. **Practical 2** — each person rates their coursemates in the app: "can I work with this person, why, and how." Update B carries this.
5. **Share-out** — each person reads their compatibility summary aloud. The room hears, for everyone, where each person stands and where they are lacking. This is the payoff of the session.

The share-out is the lesson. The summaries must be readable in ~30 seconds, honest without being cruel, and built for reading aloud to people who are sitting right there.

---

## Update A — Results Page

### A1. "How to work with me" — blend all dominant letters

Currently the work-style card is generated from the strongest dimension only. Change it:

- If one letter is dominant: current behavior, no change.
- If two or more letters are dominant (e.g. `PA`): merge the `work` entries from PROFILES for every dominant letter into one coherent card — Feedback, Delegation, Pitching ideas, What I need. Strongest letter first. If two letters say something similar, merge into one line — do not stack duplicates.
- Keep the copy-to-clipboard button. Output text follows the same merged order.

### A2. New section — "Who I work best with"

Place after "Your combinations". Show up to **3 cards**, in this order:

1. **Best complement #1** — the code that completes yours (dominant in your secondary/missing letters). For `PA` that is `EI`. Card contents:
   - Letters + combination name from COMBINATIONS (e.g. "EI — Creative Harmonizer") when one matches; otherwise a composed label.
   - Why, in 2–3 concrete lines: what they cover that you skip, drawn from PROFILES meanings (e.g. "E places the bets you won't place. I reads the room you skip. Together, your plan actually gets followed.").
   - **How to work with them** — 1–2 lines pulled from that dimension's `work` entries (delegate / pitch / feedback), written as guidance for the rater: e.g. "Give them the problem, not the solution — check direction, not steps."
2. **Best complement #2** — a single-letter specialist dominant in one of your missing letters (for `PA`: either a strong `E` or a strong `I` person). Same card structure, shorter: what they add, how to work with them.
3. **Friction profile** — the code most likely to collide with yours. Rules: same top letter as yours (two drivers, one pace — for `PA`, another `PA`: "great execution, competing pace, nobody dreams or holds people"), or their top letter is a conflict pair with your top while both dominant. Card contents: letters, why it collides (name the tension in plain words, reuse CONFLICTS language: "speed vs structure", "results vs people"), and one line on how to survive it if you end up working together.

Card visuals match the combinations cards. Cap at 3 cards — the page must not bloat.

### A3. Logic notes

- Complementarity = their dominance on your secondary/missing letters, plus your dominance on their weak letters (mutual coverage scores higher).
- Friction = shared dominant top letter, or both-dominant conflict pair.
- All reason text must pull real language from PROFILES and CONFLICTS — no new invented jargon.
- Works for any code shape: single dominant, two dominant, three dominant, none dominant (none: show the existing "you are still deciding" note and make the complement cards generic — "try leaning into one dimension for a semester").

---

## Update B — New Tool "Rate Your People" (`/rate`)

### Purpose

The rater analyzes specific people — at the crash course, their coursemates — and gets: their perceived code, whether the rater can work with them (tier + why), and where each side lacks. Perception, not truth. The framing on screen must say so.

### B1. Entry

- "Whose people are we rating?" — enter your name.
- The app silently loads YOUR code from the previous test (browser storage — `loadCompleted` / answers already saved after Practical 1). Show it small on screen: "You are rating as `PAei`" with a change link.
- **Fallback** if no stored answers: type your code manually (four letters, e.g. `PAei`) — do NOT force the full test. Manual entry validates the letter pattern and maps capital/small to dominant/secondary using standard thresholds.

### B2. Add people

- List UI: "Who are you analyzing?" — add names one at a time. These are the people at this crash course — the tool is built for the room.
- Typical count 2–4. No hard cap, but the intro line suggests: "Pick the people you are least sure about — that is where the answer matters."
- Names are session-only. No backend, no storage beyond the browser session.

### B3. Questions about each person

Third-person behavioral PAEI statements, answered 1–5 (never → always) **about that person**. 16 questions per person, 4 per dimension, shuffled order. No timer. Progress indicator per person ("Questions about Marijs — 7 of 16"). Full question set lives in `data/perception-questions.ts`:

**Producer (P)**
1. When something needs to be done, they start immediately, even before having all the details.
2. They would rather do a task themselves than delegate and wait for someone else to finish.
3. When they take on something, they push through obstacles until it is done.
4. When someone asks how something is going, they show results rather than talk about plans.

**Administrator (A)**
5. Before starting anything, they want to know the full scope, who does what, and how long it takes.
6. They get frustrated when people skip processes or do things without a plan.
7. When something goes wrong, their first question is what process failed.
8. They keep track of details that other people do not even notice.

**Entrepreneur (E)**
9. They get excited by new ideas, even risky ones, and want to act on them quickly.
10. When they see an opportunity, they want to move before someone else does.
11. They challenge how things are currently done and look for better ways.
12. They would rather try something new and fail than keep doing things the same way forever.

**Integrator (I)**
13. When two people they know are in conflict, they want to help resolve it.
14. They notice when someone is stressed or unhappy, even if that person does not say it.
15. They make decisions based on how they affect people, not just outcomes.
16. They care about how everyone in the group gets along, not just what gets done.

Wording rules: observable behavior, never value judgments ("they are disorganized" is banned). The rater answers for the person they know, not for an ideal.

### B4. Scoring — perceived code

- Same thresholds as the main test: average per dimension → Very Dominant / Dominant (capital) · Secondary (small) · Missing.
- Output = their **perceived code**, always displayed under the label **"How you see them"**. This framing is the lesson of the whole practical — perception is data about the relationship, not a verdict on the person.

### B5. Compatibility engine (rater code vs perceived code)

Four tiers:

| Tier | Meaning |
|------|---------|
| **Best fit** | Their strengths cover your gaps and yours cover theirs — mutual complement |
| **Good fit** | Work well together, one manageable friction |
| **Watch out** | A real tension exists — name it |
| **High friction** | Your dominant letters fight — say exactly what collides |

Rule skeleton (exact weights open during implementation):

- **Mutual coverage score** — their dominant letters land on your secondary/missing letters, and vice versa. High mutual coverage → Best fit.
- **Conflict count** — both top letters form a CONFLICTS pair (P–A, P–I, E–A, E–I, P–E, A–I) and both are dominant → Watch out; both dominant AND one side missing the other's top letter → High friction.
- **Shared gaps** — a dimension missing on BOTH sides. Not a tier driver by itself, but every report must name it: "Between you, nobody holds the [X] side — tension will go unspoken."
- Same top letter on both (two `PA`s): friction profile from Update A applies — Watch out at minimum, with the "competing pace, nobody dreams" line.

Every tier reason must be built from existing data: PROFILES meanings, CONFLICTS titles/descriptions, combination names. No new jargon.

### B6. Output card per person

- Their perceived code, large, in letter colors (same visual language as results).
- One line: what that code means (from PROFILES / COMBINATIONS).
- Tier badge.
- **Why** — 2–3 concrete lines: who covers what, which named conflict, the shared gap.
- **Where each of you lacks** — explicit, separate line.
- **Copy summary** button → plain text in the rater's voice, built for reading aloud (~30 seconds):

```
I rated [Name] as [code] — [tier].
What works: [complementarity line].
Watch for: [named conflict or shared gap].
Where we lack: [shared missing dimension, or their weak vs my weak].
— Rated on the PAEI app · Future Leaders — Leadership I
```

### B7. Cohort map + share-out support

- After all rated people: a stacked list — name, perceived code, tier badge. The rater's "map of the room" for the share-out.
- Persistent line on this view: "The people you rated are in this room. Present out loud — hearing how you are seen is the point."
- Per-card "present" mode optional: big text version of the summary for showing to the person rated.

### B8. Boundaries

- No backend, no database, no accounts. Session state in the browser only, same as the rest of the app.
- Nothing is stored or sent anywhere. Results die with the tab.
- Perception disclaimer visible at the top of every rated person's card, not just buried in fine print.

---

## Tech Requirements (unchanged from v1)

- Next.js App Router + TypeScript — **note: this repo's Next.js may differ from training data; read the relevant guides in `node_modules/next/dist/docs/` before writing code, per AGENTS.md**
- Tailwind CSS — same dark, minimal, mobile-first language as the rest of the app
- No backend, no API routes, no environment variables
- Mobile-first: people do Practical 2 on phones, in a room, in a hurry
- Fast: no heavy images or animations
- New page: `/rate`. In-place updates: `/results`.

## Design Notes

- Same visual language throughout: dark background, big typography, per-letter colors (P amber, A blue, E purple, I green).
- Tier badges: calm colors — Best fit green, Good fit neutral, Watch out amber, High friction red-ish. Text carries the meaning; color only supports.
- Perception framing ("How you see them") visible on every card, not just the disclaimer.
- Summary output plain text — easy to paste into notes or WhatsApp after the session.
- Question screens in `/rate` must feel as fast as the main quiz: one question at a time, big 1–5 buttons, progress bar, no timer.

## File Structure

```
/app
  rate/page.tsx          New — Rate Your People flow (entry → names → questions → cards → cohort map)
  results/page.tsx       Update — A1 work-with-me blend, A2 who I work best with
/lib
  perception.ts          16 answers → perceived code (reuse scoring thresholds from scoring.ts)
  compatibility.ts       Two codes → tier + reasons + shared gaps (reuse CONFLICTS + PROFILES)
  rate-session.ts        Rater state for the browser session (name, own code, rated people, answers)
/data
  perception-questions.ts   The 16 third-person statements, 4 per dimension
```

## What Success Looks Like

Crash course flow runs without friction: everyone finishes Practical 1 knowing their code and who completes them. In Practical 2, each person rates 2–4 coursemates in about five minutes and walks away with copyable summaries. In the share-out, each person reads theirs aloud in under a minute, and the room — hearing "best fit", "watch out", "between you nobody holds the people side" about people sitting three seats away — understands, without being lectured, that leadership is complementarity and that how you are seen is data.
