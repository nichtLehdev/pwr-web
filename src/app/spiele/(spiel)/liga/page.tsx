import type { Metadata } from "next";
import { LeagueTable } from "../../_components/league";

export const metadata: Metadata = { title: "Liga", robots: { index: false } };

export default function Page() {
  return <LeagueTable />;
}
