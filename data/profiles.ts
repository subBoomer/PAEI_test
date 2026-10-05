import type { Dimension } from "./questions";

export interface DimensionProfile {
  letter: Dimension;
  name: string;
  meaning: string;
  strengths: string[];
  weaknesses: string[];
  roles: string[];
  nickname: string;
  color: string;
  reflection: string[];
  work: { feedback: string; delegate: string; pitch: string; need: string };
}

export const PROFILES: Record<Dimension, DimensionProfile> = {
  P: {
    letter: "P",
    name: "Producer",
    meaning:
      "The Producer is the part of you that turns effort into results. When this dimension is strong, you feel an itch to start, to finish, and to show what got done.",
    strengths: [
      "Gets results",
      "Hardworking and fast",
      "Delivers under pressure",
      "Pushes through obstacles",
    ],
    weaknesses: [
      "Can burn out",
      "May skip processes",
      "Can be impatient with people",
    ],
    roles: [
      "Delivery & execution lead",
      "Project manager",
      "Growth & sales — the closing side",
    ],
    nickname: "Lone Ranger",
    color: "#f59e0b",
    reflection: [
      "Recall a task you pushed through on willpower alone. What did it cost — your energy, the quality, or a relationship?",
      "When did you last do something yourself that you could have delegated? What made you distrust the handoff?",
      "Would your teammates say you care more about shipped results or about the people doing the shipping?",
    ],
    work: {
      feedback: "Lead with the result. What shipped, what didn't, what's next — skip the preamble.",
      delegate: "Hand me a concrete outcome and a deadline. Check progress, not process.",
      pitch: "Frame it as action: what we do, how fast, what it produces. Vision alone loses me.",
      need: "People who finish — and someone to remind me that done beats perfect.",
    },
  },
  A: {
    letter: "A",
    name: "Administrator",
    meaning:
      "The Administrator is the part of you that builds order. You want to know the scope, the roles, and the timeline before things move.",
    strengths: [
      "Organized and systematic",
      "Detail-oriented",
      "Creates structure others can follow",
      "Steady and reliable",
    ],
    weaknesses: [
      "Can be slow to start",
      "May resist change",
      "Can be rigid with rules",
    ],
    roles: [
      "Operations & finance lead",
      "Process & analytics owner",
      "Product ops & quality",
    ],
    nickname: "Bureaucrat",
    color: "#3b82f6",
    reflection: [
      "Think of a project that went off the rails. What process, if any, was already missing when it began?",
      "When did you last improvise in a situation that clearly needed a plan? What happened next?",
      "Name one recurring mess in your studies or side projects that a simple checklist would prevent. Why hasn't it been made yet?",
    ],
    work: {
      feedback: "Be specific. Bring data, name the process that failed, propose the fix.",
      delegate: "Set scope, roles, and timeline up front. I'll run it tightly once the frame is clear.",
      pitch: "Show the plan behind the idea: steps, owners, risks. Structure earns my trust.",
      need: "People who respect agreed processes — and tell me when a rule has become a cage.",
    },
  },
  E: {
    letter: "E",
    name: "Entrepreneur",
    meaning:
      "The Entrepreneur is the part of you that looks ahead. You get energy from new ideas, new opportunities, and challenging how things are done today.",
    strengths: [
      "Visionary and innovative",
      "Spots opportunities early",
      "Embraces change",
      "Thinks in years, not days",
    ],
    weaknesses: [
      "May lack follow-through",
      "Can get scattered",
      "Starts more than it finishes",
    ],
    roles: [
      "Founder / CEO track",
      "Innovation & strategy lead",
      "Fundraising & partnerships",
    ],
    nickname: "Arsonist",
    color: "#a855f7",
    reflection: [
      "When did you last feel excited by an idea and not act on it? What stopped you?",
      "What do you keep doing 'the way it has always been done' that you secretly suspect could be better?",
      "Where do you want to be in three years — and what is one step you could take this month toward it?",
    ],
    work: {
      feedback: "Be candid and fast. A hard truth early beats a comfortable story late.",
      delegate: "Give me the problem, not the solution. Check direction, not steps.",
      pitch: "Lead with the future state and why it matters. Details can follow.",
      need: "Builders who turn sparks into shipped work — and ground me when I start too many fires.",
    },
  },
  I: {
    letter: "I",
    name: "Integrator",
    meaning:
      "The Integrator is the part of you that holds people together. You read the room, care about relationships, and want the group to work as one.",
    strengths: [
      "Builds trust",
      "Resolves conflict",
      "Creates culture",
      "People-oriented and empathetic",
    ],
    weaknesses: [
      "May avoid hard decisions",
      "Can prioritize feelings over results",
    ],
    roles: [
      "Team & culture lead",
      "Client relations & community",
      "Customer success & mediation",
    ],
    nickname: "Super-Follower",
    color: "#10b981",
    reflection: [
      "When did you last sense that someone on your team was struggling — before they said anything?",
      "Describe a conflict you chose to avoid. What did that cost, and what would you do differently?",
      "Whose perspective do you habitually leave out of your decisions, and what would change if you included it?",
    ],
    work: {
      feedback: "Be honest and private. Hard messages one-on-one, never in front of the group.",
      delegate: "Tell me why it matters to the team. I'll carry it if people feel the purpose.",
      pitch: "Connect it to people: who it helps, how the team wins, what it feels like to build it.",
      need: "Allies who say the quiet part out loud — and someone to back me when a decision gets unpopular.",
    },
  },
};

export interface Combination {
  letters: string;
  name: string;
  description: string;
}

export const COMBINATIONS: Combination[] = [
  {
    letters: "PA",
    name: "Practical Organizer",
    description:
      "Plans, organizes, gets it done. Vision is welcome but needs a plan.",
  },
  {
    letters: "PE",
    name: "Visionary Doer",
    description: "Creates and executes. Startups need this.",
  },
  {
    letters: "PI",
    name: "Harmonious Producer",
    description: "Gets things done while keeping the team together.",
  },
  {
    letters: "AE",
    name: "Structured Visionary",
    description: "Innovates within structure. Good for scaling.",
  },
  {
    letters: "AI",
    name: "Systemic Harmonizer",
    description: "Builds organized culture. Good for operations.",
  },
  {
    letters: "EI",
    name: "Creative Harmonizer",
    description: "Innovates through people. Good for culture change.",
  },
  {
    letters: "PAE",
    name: "Balanced Innovator",
    description: "Execution, structure, and vision. Rare and powerful.",
  },
  {
    letters: "PAI",
    name: "Grounded Harmonizer",
    description: "Results, systems, and people. Steady leader.",
  },
  {
    letters: "AEI",
    name: "Comprehensive Navigator",
    description: "Structure, vision, and people. Strategic leader.",
  },
  {
    letters: "PAEI",
    name: "Complete Manager",
    description:
      "Strong in all four. Very rare — good at everything but master of nothing.",
  },
];

export interface Conflict {
  a: Dimension;
  b: Dimension;
  title: string;
  description: string;
}

export const CONFLICTS: Conflict[] = [
  {
    a: "P",
    b: "A",
    title: "Speed vs. Structure",
    description:
      "P pushes to move now; A wants a plan first. When both are alive in you, one side tends to win and the other feels ignored — things either ship messy or they ship late.",
  },
  {
    a: "P",
    b: "I",
    title: "Results vs. People",
    description:
      "P measures progress in output; I measures it in relationships. Push hard for results and the team can start to feel like a resource instead of a group.",
  },
  {
    a: "E",
    b: "A",
    title: "Change vs. Stability",
    description:
      "E wants to break what exists; A wants to make it reliable. This is the classic Adizes tension — vision needs a system to survive, and systems are afraid of vision.",
  },
  {
    a: "E",
    b: "I",
    title: "Risk vs. Harmony",
    description:
      "E disrupts to move forward; I keeps the group intact. New directions can feel like instability to the people who hold your culture together.",
  },
  {
    a: "P",
    b: "E",
    title: "Doing vs. Dreaming",
    description:
      "P wants the next task finished; E wants the next big thing started. Both are forward energy — the tension here is focus, not direction.",
  },
  {
    a: "A",
    b: "I",
    title: "Rules vs. Relationships",
    description:
      "A wants consistent process; I wants to flex for people. Handled well this is a strength, but when they clash, someone ends up feeling treated like a number.",
  },
];
