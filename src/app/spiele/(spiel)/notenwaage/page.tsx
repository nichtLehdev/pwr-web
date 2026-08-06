import type { Metadata } from "next";
import { gameBySlug } from "../../_lib/games";
import { NoteValueGame } from "./_components/note-value-game";

const game = gameBySlug("notenwaage")!;

export const metadata: Metadata = {
  title: game.title,
  description: game.metaDescription,
};

export default function NotenwaagePage() {
  return <NoteValueGame />;
}
