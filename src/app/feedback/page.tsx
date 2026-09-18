import { redirect } from "next/navigation";

import { env } from "@/env";
import FeedbackClient from "./feedback-client";

// Per request: a static prerender would bake in the build-time env, which has no GITHUB_TOKEN.
export const dynamic = "force-dynamic";

/** GitHub-issues backed; only where GITHUB_TOKEN/GITHUB_REPO are set (beta), otherwise /kontakt. */
export default function FeedbackPage() {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    redirect("/kontakt");
  }
  return <FeedbackClient />;
}
