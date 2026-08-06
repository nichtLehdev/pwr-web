import { redirect } from "next/navigation";

/**
 * /dashboard/history was a near-duplicate of /dashboard/history-timeline
 * whose internal links already pointed at the timeline tree. The section
 * lives there now; this keeps old bookmarks and deep links working.
 */
export default async function LegacyHistoryRedirect({
  params,
}: {
  params: Promise<{ rest?: string[] }>;
}) {
  const { rest } = await params;
  redirect(["/dashboard/history-timeline", ...(rest ?? [])].join("/"));
}
