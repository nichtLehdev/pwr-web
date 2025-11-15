"use client"; // This component is interactive

import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { AuswahlChor, Event } from "@/types/strapi";
import { getUpcomingEventsByAuswahlchor } from "@/lib/mockData";
import ConcertCard from "./ConcertCard";

function getRandomImagePaths(
  slug: string,
  totalImages: number,
  numToGet: number
): string[] {
  if (totalImages === 0) return [];

  const imageIndices = Array.from({ length: totalImages }, (_, i) => i + 1);

  for (let i = imageIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [imageIndices[i], imageIndices[j]] = [imageIndices[j], imageIndices[i]];
  }

  const selectedIndices = imageIndices.slice(
    0,
    Math.min(numToGet, totalImages)
  );

  return selectedIndices.map(
    (index) => `/images/auswahlchoere/${slug}/${index}.jpg`
  );
}

type ChorWithField = AuswahlChor & { imageCount: number };

interface AuswahlchoereClientProps {
  ensembles: ChorWithField[];
}

export default function AuswahlchoereClient({
  ensembles,
}: AuswahlchoereClientProps) {
  const [randomizedEnsembles] = useState(
    ensembles.map((ensemble) => ({
      ...ensemble,
      randomImages: getRandomImagePaths(ensemble.slug, ensemble.imageCount, 2),
      concerts: getUpcomingEventsByAuswahlchor(ensemble.name),
    }))
  );

  return (
    <div>
      <PageHeader title="Auswahlchöre" color="district-3" />

      {/* Hero Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-district-3 text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Unsere Auswahlchöre
            </h1>
            <p className="text-lg md:text-xl leading-relaxed opacity-95">
              Die Auswahlchöre des Posaunenwerks Rheinland repräsentieren die
              musikalische Spitze unserer Arbeit. Sie setzen sich aus besonders
              engagierten und talentierten Bläserinnen und Bläsern zusammen und
              präsentieren die Vielfalt der Posaunenchormusik auf höchstem
              Niveau.
            </p>
          </div>
        </div>
      </section>

      {/* Ensembles */}
      {randomizedEnsembles.map((ensemble, index) => (
        <section
          key={ensemble.name}
          className={`py-12 md:py-16 lg:py-20 ${
            index % 2 === 0 ? "bg-background" : "bg-background-secondary"
          }`}
        >
          <div className="container">
            <div
              className={`flex flex-col ${
                index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
              } gap-8 lg:gap-12 items-start max-w-6xl mx-auto`}
            >
              <div className="w-full lg:w-1/2">
                <div className="rounded-lg overflow-hidden shadow-xl h-full relative">
                  {ensemble.randomImages.length === 0 && (
                    <div
                      className={`absolute inset-0 ${ensemble.color} flex items-center justify-center`}
                    >
                      <svg
                        className="w-32 h-32 text-white opacity-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                        />
                      </svg>
                    </div>
                  )}

                  {ensemble.randomImages.length === 1 && (
                    <div className="relative w-full h-full">
                      <Image
                        src={ensemble.randomImages[0]}
                        alt={`Ein Bild des Ensembles ${ensemble.name}`}
                        priority={index < 2}
                        width={800}
                        height={533}
                      />
                    </div>
                  )}

                  {ensemble.randomImages.length >= 2 && (
                    <div className="grid grid-cols-1 gap-2 h-full">
                      <div className="relative w-full h-full">
                        <Image
                          src={ensemble.randomImages[0]}
                          alt={`Ein Bild des Ensembles ${ensemble.name}`}
                          width={800}
                          height={533}
                          priority={index < 2}
                        />
                      </div>
                      <div className="hidden lg:block relative w-full h-full">
                        <Image
                          src={ensemble.randomImages[1]}
                          alt={`Ein Bild des Ensembles ${ensemble.name}`}
                          width={800}
                          height={533}
                          priority={index < 2}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="w-full lg:w-1/2">
                <h2 className="text-3xl md:text-4xl font-bold text-dark mb-2 wrap-break-word">
                  {ensemble.name}
                </h2>
                <p className="text-xl text-primary font-semibold mb-6">
                  {ensemble.subtitle}
                </p>

                {/* Metadaten */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="font-semibold">
                      Seit {ensemble.founded}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    <span className="font-semibold">{ensemble.members}</span>
                  </div>
                  {ensemble.conductor && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span className="font-semibold">
                        {ensemble.conductor.displayRole &&
                          `${ensemble.conductor.displayRole} `}
                        {ensemble.conductor.displayName}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-gray-600 leading-relaxed mb-6">
                  {ensemble.description}
                </p>

                {/* Kommende Konzerte */}
                {ensemble.concerts && ensemble.concerts.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h3 className="text-lg font-bold text-dark mb-4">
                      Kommende Termine
                    </h3>
                    <div className="space-y-4">
                      {ensemble.concerts.map((concert: Event, i: number) => (
                        <ConcertCard
                          key={i}
                          concert={concert}
                          ensemble={ensemble}
                          i={i}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Bewerbung für LaJuPo */}
                {ensemble.showApplication && (
                  <div className={`p-6 ${ensemble.color}/10 rounded-lg`}>
                    <h3 className="text-lg font-bold text-dark mb-3">
                      Interesse am LaJuPo?
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Teilnehmen kann, wer 15-25 Jahre alt ist. Die Teilnahme
                      erfolgt über ein Vorspiel, das alle 2 Jahre stattfindet.
                      Mit der Teilnahme verpflichtet man sich für 2 Jahre bei
                      den 3-4 Proben&shy;wochenenden und Konzerten pro Jahr. Die
                      nächste Legislatur beginnt 2027.
                    </p>
                    <Link
                      href="/kontakt"
                      className={`inline-flex items-center px-6 py-3 ${ensemble.color} text-white font-semibold rounded-lg hover:opacity-90 transition-opacity`}
                    >
                      Jetzt informieren
                      <svg
                        className="w-5 h-5 ml-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="py-12 md:py-16 lg:py-20 bg-background-secondary"></section>

      <section className="py-12 md:py-16 lg:py-20 bg-primary text-white"></section>
    </div>
  );
}
