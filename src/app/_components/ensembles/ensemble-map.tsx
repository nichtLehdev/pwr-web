"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ExternalLinkIcon } from "lucide-react";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: typeof icon === "string" ? icon : icon.src,
  shadowUrl: typeof iconShadow === "string" ? iconShadow : iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface EnsembleMapProps {
  latitude: number;
  longitude: number;
  locationName?: string | null;
}

export default function EnsembleMap({
  latitude,
  longitude,
  locationName,
}: EnsembleMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const coordsChanged =
      !lastCoordsRef.current ||
      lastCoordsRef.current.lat !== latitude ||
      lastCoordsRef.current.lng !== longitude;

    if (!coordsChanged && mapInstanceRef.current) return;

    lastCoordsRef.current = { lat: latitude, lng: longitude };

    const initMap = () => {
      if (!mapContainerRef.current) {
        console.error("Map container not found");
        return;
      }

      try {
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch {}
        }

        mapContainerRef.current.innerHTML = "";

        if (
          mapContainerRef.current.offsetWidth === 0 ||
          mapContainerRef.current.offsetHeight === 0
        ) {
          console.warn("Map container has no dimensions, retrying...");
          setTimeout(initMap, 200);
          return;
        }

        const map = L.map(mapContainerRef.current).setView(
          [latitude, longitude],
          15,
        );
        mapInstanceRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        L.marker([latitude, longitude])
          .addTo(map)
          .bindPopup(locationName || "Probenort")
          .openPopup();

        setTimeout(() => {
          map.invalidateSize();
        }, 100);
      } catch (error) {
        console.error("Error initializing map:", error);
        if (mapContainerRef.current) {
          mapContainerRef.current.innerHTML =
            '<div class="flex h-full items-center justify-center text-red-500 p-4">Fehler beim Initialisieren der Karte</div>';
        }
      }
    };

    setTimeout(initMap, 100);

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, locationName]);

  return (
    <div className="mt-4 space-y-2">
      {/*
        `isolate` keeps Leaflet's own z-indexes — panes at 400, controls at
        800, the zoom corners at 1000 — inside their own stacking context.
        Without it they share the root context and paint over the fixed
        navigation, which sits at z-50.
      */}
      <div
        ref={mapContainerRef}
        className="dark:border-dark-border isolate h-[300px] w-full overflow-hidden rounded-lg border border-gray-200"
        style={{ minHeight: "300px" }}
      />
      <div className="dark:border-dark-border dark:bg-dark-background-secondary border-t border-gray-200 bg-gray-50 p-2 text-center">
        <Link
          href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=15`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <span>Größere Karte anzeigen</span>
          <ExternalLinkIcon className="h-3 w-3" aria-hidden="true" />
          <span className="sr-only">(Externe Seite)</span>
        </Link>
      </div>
    </div>
  );
}
