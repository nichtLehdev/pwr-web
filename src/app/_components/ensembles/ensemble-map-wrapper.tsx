"use client";

import dynamic from "next/dynamic";

// Dynamically import map component with SSR disabled to avoid hydration issues
const EnsembleMap = dynamic(
  () => import("@/app/_components/ensembles/ensemble-map"),
  {
    ssr: false,
    loading: () => (
      <div className="mt-4 space-y-2">
        <div className="dark:border-dark-border dark:bg-dark-background-secondary h-[300px] w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
          <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
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
