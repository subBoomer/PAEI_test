# PAEI Web App: Agent Prompt

## What We Are Building

A web app that lets people take a PAEI assessment and get their management style code. PAEI stands for Producer, Administrator, Entrepreneur, Integrator. It is a model by Dr. Ichak Adizes that identifies four management roles. No single person is strong in all four. Your code shows where you are strong, where you are present, and where you are weak.

## Why

This is for a university course called Future Leaders Leadership I. We need to run PAEI tests, analyze ourselves, and understand who we are as leaders and managers. The existing tests online are either too abstract, too corporate, or not relatable for students, young entrepreneurs, and early-stage workers. We designed our own question set that works for all of them. Now we need to build the app that delivers it.

The app will also be used by our team and potentially by other students in the program. It should be clean, fast, and easy to use on mobile and desktop.

## The Question Set

20 questions, 5 per dimension. Answer 1 to 5 where 1 = never, 5 = always.

### Producer (P)
1. When something needs to be done, I want to start immediately, even before I have all the details.
2. I would rather do a task myself than delegate it and wait for someone else to finish.
3. When I take on something, I push through obstacles until it is done.
4. I feel uncomfortable when I have nothing productive to do.
5. When someone asks how something is going, I want to show results, not talk about plans.

### Administrator (A)
6. Before starting anything, I want to know the full scope, who does what, and how long it takes.
7. I get frustrated when people skip processes or do things without a plan.
8. When something goes wrong, my first question is what process failed.
9. I prefer a clear rule over improvisation, even if the rule is not perfect.
10. I keep track of details that other people do not even notice.

### Entrepreneur (E)
11. I get excited by new ideas, even risky ones, and want to act on them quickly.
12. When I see an opportunity, I want to move before someone else does.
13. I enjoy challenging the status quo and finding better ways.
14. I often think about where I or my business should be in 3 to 5 years.
15. I would rather try something new and fail than do things the same way forever.

### Integrator (I)
16. When two people I know are in conflict, I want to help resolve it.
17. I notice when someone is stressed or unhappy, even if they do not say it.
18. I make decisions based on how they affect people, not just outcomes.
19. People often come to me for advice because they feel heard.
20. In a group, I care about how everyone gets along, not just what gets done.

## Scoring

Each dimension is scored as an average of its 5 questions (1 to 5 scale).

- 4.5 to 5.0: Very Dominant, capital letter
- 3.5 to 4.4: Dominant, capital letter
- 2.5 to 3.4: Secondary, small letter
- 1.0 to 2.4: Missing

The result is a 4 letter code like PAei, PaEI, paei, etc. Capital letter means natural strength. Small letter means present but not natural. Missing means weak.

## What the App Should Show

### Landing page
- Title: PAEI Test
- Short description of what it is
- Start button
- Clean, minimal design. Dark or light theme. No clutter.

### Quiz page
- One question at a time or all 20 at once. Your choice based on what feels better.
- Each question has a 1 to 5 scale selector
- Progress indicator (question 5 of 20)
- No timer. People should think.

### Results page
- The 4 letter code displayed large (e.g. PAei)
- Each dimension shown with:
  - The letter and its label (Producer, Administrator, Entrepreneur, Integrator)
  - The score (average)
  - The rank (Very Dominant, Dominant, Secondary, Missing)
  - A short description of what that dimension means
  - Strengths and weaknesses of that dimension
- A summary paragraph combining all four
- Natural conflicts section: which dimensions are in tension for this person
- Share button: share results as an image or link

### Profile descriptions for each dimension

**Producer (P)**
Strengths: Gets results, hardworking, fast, delivers under pressure
Weaknesses: Can burn out, may skip processes, can be impatient with people
Nickname when dominant alone: Lone Ranger

**Administrator (A)**
Strengths: Organized, systematic, detail-oriented, creates structure
Weaknesses: Can be slow, may resist change, can be rigid with rules
Nickname when dominant alone: Bureaucrat

**Entrepreneur (E)**
Strengths: Visionary, innovative, sees opportunities, embraces change
Weaknesses: May lack execution, can be scattered, starts but does not finish
Nickname when dominant alone: Arsonist

**Integrator (I)**
Strengths: Builds trust, resolves conflict, creates culture, people-oriented
Weaknesses: May avoid hard decisions, can prioritize feelings over results
Nickname when dominant alone: Super-Follower

### Combination descriptions (show the top 2 or 3 combinations)

**PA** - Practical Organizer. Plans, organizes, gets it done. Vision is welcome but needs a plan.
**PE** - Visionary Doer. Creates and executes. Startups need this.
**PI** - Harmonious Producer. Gets things done while keeping the team together.
**AE** - Structured Visionary. Innovates within structure. Good for scaling.
**AI** - Systemic Harmonizer. Builds organized culture. Good for operations.
**EI** - Creative Harmonizer. Innovates through people. Good for culture change.
**PAE** - Balanced Innovator. Execution, structure, and vision. Rare and powerful.
**PAI** - Grounded Harmonizer. Results, systems, and people. Steady leader.
**AEI** - Comprehensive Navigator. Structure, vision, and people. Strategic leader.
**PAEI** - Complete Manager. All four present. Very rare. Good at everything but master of nothing.

## Tech Requirements

- Frontend: Next.js or React. Keep it simple.
- Styling: Tailwind CSS or plain CSS. Clean, modern, minimal.
- No backend needed. All scoring happens in the browser.
- No database. Results are shown to the user, not stored.
- Mobile responsive. Students will use phones.
- Fast load times. No heavy images or animations that slow it down.
- Deployment: Vercel. Free tier is fine.

## Design Notes

- The app should feel modern and clean, not corporate
- Big typography for the result code
- Use color to distinguish the 4 dimensions (one color per letter)
- Progress bar during quiz
- Smooth transitions between questions
- No ads, no signup, no email capture. Just the test and the result.

## File Structure Suggestion

```
/app
  /page.tsx          - Landing page
  /quiz/page.tsx     - Quiz page
  /results/page.tsx  - Results page
/components
  QuestionCard.tsx
  ScaleSelector.tsx
  ResultCard.tsx
  DimensionCard.tsx
/data
  questions.ts       - The 20 questions
  profiles.ts        - Dimension descriptions and combinations
```

## Deployment

Deploy to Vercel. Connect the GitHub repo, Vercel auto-deploys on push. Free tier handles this easily. No environment variables needed. No API routes needed. Pure frontend.
