"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";

// Mock-Daten - später von Strapi
const mockChoirs = [
  {
    id: 1,
    name: "Posaunenchor Düsseldorf-Mitte",
    city: "Düsseldorf",
    zip: "40210",
    district: "Bezirk 2",
    districtNumber: 2,
    contact: "chorleiter@beispiel.de",
    rehearsal: "Donnerstags, 19:30 Uhr",
    location: "Gemeindezentrum, Hauptstraße 12",
  },
  {
    id: 2,
    name: "Evangelischer Posaunenchor Bonn",
    city: "Bonn",
    zip: "53111",
    district: "Bezirk 5",
    districtNumber: 5,
    contact: "info@posaunenchor-bonn.de",
    rehearsal: "Mittwochs, 20:00 Uhr",
    location: "Kreuzkirche, Bonner Straße 45",
  },
  {
    id: 3,
    name: "Posaunenchor Köln-Süd",
    city: "Köln",
    zip: "50667",
    district: "Bezirk 3",
    districtNumber: 3,
    contact: "leitung@pk-koeln-sued.de",
    rehearsal: "Dienstags, 19:00 Uhr",
    location: "Lutherkirche, Südstraße 89",
  },
  // Weitere Mock-Chöre...
];

export default function ChorFindenPage() {
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Filter-Logik
  const filteredChoirs = mockChoirs.filter((choir) => {
    const matchesDistrict =
      selectedDistrict === "all" ||
      choir.districtNumber === parseInt(selectedDistrict);
    const matchesSearch =
      searchTerm === "" ||
      choir.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      choir.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      choir.zip.includes(searchTerm);

    return matchesDistrict && matchesSearch;
  });

  return (
    <div>
      <PageHeader title="Finde deinen Posaunenchor" color="primary" />

      {/* Hero Section */}
      <section className="bg-primary text-white py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Finde deinen Posaunenchor
            </h1>
            <p className="text-lg md:text-xl mb-8 leading-relaxed">
              Im Rheinland gibt es über 330 Posaunenchöre mit mehr als 11.000
              aktiven Bläserinnen und Bläsern. Finde einen Chor in deiner Nähe
              und werde Teil unserer musikalischen Gemeinschaft!
            </p>
          </div>
        </div>
      </section>

      {/* Kontakt-Info */}
      <section className="py-12 md:py-16 bg-background-secondary">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8 md:p-10">
              <div className="flex items-start gap-6">
                <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shrink-0">
                  <svg
                    className="w-7 h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-dark mb-3">
                    Persönliche Beratung gewünscht?
                  </h2>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Unsere Regionalposaunenwarte und Bezirksobleute helfen dir
                    gerne bei der Suche nach dem passenden Chor in deiner
                    Region. Sie kennen die Chöre vor Ort und können dich
                    individuell beraten.
                  </p>
                  <Link
                    href="/kontakt"
                    className="inline-flex items-center px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Kontakt aufnehmen
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chor-Liste mit Filter */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-8">
              Alle Posaunenchöre
            </h2>

            {/* Filter */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bezirk-Filter */}
                <div>
                  <label
                    htmlFor="district"
                    className="block text-sm font-semibold text-dark mb-2"
                  >
                    Bezirk
                  </label>
                  <select
                    id="district"
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="all">Alle Bezirke</option>
                    {Array.from({ length: 13 }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num.toString()}>
                        Bezirk {num}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Stadt/PLZ-Suche */}
                <div>
                  <label
                    htmlFor="search"
                    className="block text-sm font-semibold text-dark mb-2"
                  >
                    Stadt oder PLZ
                  </label>
                  <input
                    id="search"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="z.B. Düsseldorf oder 40210"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-600">
                {filteredChoirs.length} Chor{filteredChoirs.length !== 1 && "e"}{" "}
                gefunden
              </div>
            </div>

            {/* Chor-Liste */}
            {filteredChoirs.length > 0 ? (
              <div className="grid grid-cols-1 gap-6">
                {filteredChoirs.map((choir) => (
                  <div
                    key={choir.id}
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-dark mb-2">
                          {choir.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            {choir.city}, {choir.zip}
                          </div>
                          <span className="text-gray-400">•</span>
                          <span className="font-semibold text-primary">
                            {choir.district}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-start gap-2 text-sm text-gray-700">
                        <svg
                          className="w-5 h-5 text-gray-400 shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>
                          <strong>Probe:</strong> {choir.rehearsal}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-gray-700">
                        <svg
                          className="w-5 h-5 text-gray-400 shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                        <span>{choir.location}</span>
                      </div>
                    </div>

                    <a
                      href={`mailto:${choir.contact}`}
                      className="inline-flex items-center text-primary hover:text-primary-dark font-semibold text-sm"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      Kontakt aufnehmen
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <svg
                  className="w-16 h-16 text-gray-300 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <h3 className="text-xl font-bold text-dark mb-2">
                  Keine Chöre gefunden
                </h3>
                <p className="text-gray-600 mb-6">
                  Probiere eine andere Suche oder kontaktiere uns für
                  persönliche Beratung.
                </p>
                <Link
                  href="/kontakt"
                  className="inline-flex items-center px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Kontakt aufnehmen
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
