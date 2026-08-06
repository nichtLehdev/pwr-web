import type { Metadata } from "next";
import { gameBySlug } from "../../_lib/games";
import { NoteReadingGame } from "./_components/note-reading-game";

const game = gameBySlug("noten-lesen")!;

export const metadata: Metadata = {
  title: game.title,
  description: game.metaDescription,
};

export default function NotenLesenPage() {
  return <NoteReadingGame />;
}
