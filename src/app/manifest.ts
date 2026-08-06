import type { MetadataRoute } from "next";

/**
 * Web-App-Manifest — macht die Seite installierbar (PWA).
 * `start_url` zeigt auf die Spiele-Übersicht: mobil ist das der Haupt-Einsatzfall;
 * `scope: "/"` hält Navigation zum Rest der Seite in der App.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Posaunenwerk Rheinland",
    short_name: "Posaunenwerk",
    description:
      "Evangelisches Posaunenwerk in der Evangelischen Kirche im Rheinland — mit interaktiven Übungen und Spielen.",
    lang: "de",
    start_url: "/spiele",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
