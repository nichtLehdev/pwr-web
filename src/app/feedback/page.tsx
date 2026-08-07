import { redirect } from "next/navigation";

import { env } from "@/env";
import FeedbackClient from "./feedback-client";

// Must be decided per request from the runtime env — a static prerender
// would bake the build-time env (no GITHUB_TOKEN in the Docker build) into
// the page and disable feedback everywhere, including beta.
export const dynamic = "force-dynamic";

/**
 * The feedback page (GitHub-issues backed) only exists where the GitHub
 * integration is configured — i.e. on the beta/current server. In
 * production GITHUB_TOKEN/GITHUB_REPO are unset and visitors are sent to
 * the contact page instead.
 */
export default function FeedbackPage() {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    redirect("/kontakt");
  }
  return <FeedbackClient />;
}
