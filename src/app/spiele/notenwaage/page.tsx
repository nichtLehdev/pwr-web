import { GameExitLink } from "../_components/game-exit-link";
import { NoteValueGame } from "./_components/note-value-game";

export default function NotenwaagePage() {
  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col px-3 pt-1 pb-3 md:px-5 md:pb-6">
      <GameExitLink />
      <h1 className="sr-only">Notenwaage-Spiel</h1>
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 pt-11 md:pt-12">
        <NoteValueGame />
      </div>
    </div>
  );
}
