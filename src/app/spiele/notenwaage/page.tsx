import { GameExitLink } from "../_components/game-exit-link";
import { NoteValueGame } from "./_components/note-value-game";

export default function NotenwaagePage() {
  return (
    <div className="relative flex w-full flex-1 flex-col px-3 pb-6 pt-1 md:px-5">
      <GameExitLink />
      <h1 className="sr-only">Notenwaage-Spiel</h1>
      <div className="mx-auto w-full max-w-5xl pt-11 md:pt-12">
        <NoteValueGame />
      </div>
    </div>
  );
}
