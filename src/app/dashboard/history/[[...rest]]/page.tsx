import { redirect } from "next/navigation";

/** Keeps old /dashboard/history bookmarks and deep links working. */
export default async function LegacyHistoryRedirect({
  params,
}: {
  params: Promise<{ rest?: string[] }>;
}) {
  const { rest } = await params;
  redirect(["/dashboard/history-timeline", ...(rest ?? [])].join("/"));
}
