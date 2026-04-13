import { GameExitLink } from "../_components/game-exit-link";
import { RhythmGame } from "./_components/rhythm-game";

export default function RhythmusSpielPage() {
  return (
    <div className="relative flex w-full flex-1 flex-col px-3 pb-6 pt-1 md:px-5">
      <GameExitLink />
      <h1 className="sr-only">Rhythmus-Spiel</h1>
      <div className="mx-auto w-full max-w-5xl pt-11 md:pt-12">
        <RhythmGame />
      </div>
    </div>
  );
}
