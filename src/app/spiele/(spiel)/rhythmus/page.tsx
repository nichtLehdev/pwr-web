import type { Metadata } from "next";
import { gameBySlug } from "../../_lib/games";
import { RhythmGame } from "./_components/rhythm-game";

const game = gameBySlug("rhythmus")!;

export const metadata: Metadata = {
  title: game.title,
  description: game.metaDescription,
};

export default function RhythmusSpielPage() {
  return <RhythmGame />;
}
