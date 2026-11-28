import type { Metadata } from "next";
import { gameBySlug } from "../../_lib/games";
import { DictationGame } from "./_components/dictation-game";

const game = gameBySlug("diktat")!;

export const metadata: Metadata = {
  title: game.title,
  description: game.metaDescription,
};

export default function DiktatSpielPage() {
  return <DictationGame />;
}
