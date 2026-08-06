import type { Metadata } from "next";
import { gameBySlug } from "../../_lib/games";
import { FingeringGame } from "./_components/fingering-game";

const game = gameBySlug("griffe")!;

export const metadata: Metadata = {
  title: game.title,
  description: game.metaDescription,
};

export default function GriffePage() {
  return <FingeringGame />;
}
