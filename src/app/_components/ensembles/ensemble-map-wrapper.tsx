"use client";

import dynamic from "next/dynamic";

const EnsembleMap = dynamic(
  () => import("@/app/_components/ensembles/ensemble-map"),
  {
    ssr: false,
    loading: () => (
      <div className="mt-4 space-y-2">
        {/* Eckig und auf Haarlinie: Der Platzhalter soll die Karte vertreten,
            die danach an derselben Stelle steht — nicht als grauer Kasten mit
            Rundung aus der alten Gestaltung stehenbleiben. */}
        <div className="border-rule bg-rule/25 dark:border-night-rule dark:bg-night-raised h-[300px] w-full overflow-hidden border">
          <div className="text-dark dark:text-night-muted flex h-full items-center justify-center">
            Karte wird geladen...
          </div>
        </div>
      </div>
    ),
  },
);

interface EnsembleMapWrapperProps {
  latitude: number;
  longitude: number;
  locationName?: string | null;
}

export default function EnsembleMapWrapper({
  latitude,
  longitude,
  locationName,
}: EnsembleMapWrapperProps) {
  return (
    <EnsembleMap
      latitude={latitude}
      longitude={longitude}
      locationName={locationName}
    />
  );
}
