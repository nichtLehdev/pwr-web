import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPO = process.env.GITHUB_REPO; // e.g. 'lehdev/posaunenwerk'

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 },
    );
  }

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/issues?state=open&per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch issues" },
      { status: 500 },
    );
  }

  const data = await res.json();

  const excludedStatusLabels = ["done", "wontfix"];
  const filtered = data.filter(
    (item: { pull_request?: unknown; labels?: { name: string }[] }) => {
      // Only show issues, not pull requests
      if (item.pull_request) return false;
      const hasExcludedStatus = (item.labels ?? []).some(
        (l: { name: string }) =>
          excludedStatusLabels.includes(l.name.toLowerCase()),
      );
      return !hasExcludedStatus;
    },
  );

  return NextResponse.json(filtered);
}
