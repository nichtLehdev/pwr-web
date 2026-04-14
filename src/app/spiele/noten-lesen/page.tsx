import { GameExitLink } from "../_components/game-exit-link";
import { NoteReadingGame } from "./_components/note-reading-game";

export default function NotenLesenPage() {
  return (
    <div className="relative flex w-full flex-1 flex-col px-3 pb-6 pt-1 md:px-5">
      <GameExitLink />
      <h1 className="sr-only">Noten-Lese-Spiel</h1>
      <div className="mx-auto w-full max-w-5xl pt-11 md:pt-12">
        <NoteReadingGame />
      </div>
    </div>
  );
}
