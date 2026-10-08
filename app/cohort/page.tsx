import { redirect } from "next/navigation";

// Cohort view merged into the mentor view (one tool for mentors, since this
// program has mentors, not teachers). Old links keep working.
export default function CohortPage() {
  redirect("/mentor");
}
