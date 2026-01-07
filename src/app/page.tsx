"use client";

import Link from "next/link";
import { useMemo } from "react";
import SectionHeader from "./_components/section-header";
import EventCard from "./_components/events/event-card";
import PostCard from "./_components/posts/post-card";
import { api } from "@/trpc/react";
import LoadingSpinner from "./_components/general/loading-spinner";
import { Building2, ChevronRight } from "lucide-react";

export default function Home() {
  const startDate = useMemo(() => new Date(), []);

  const { data: upcomingEvents, isLoading: isLoadingEvents } =
    api.events.getAll.useQuery({
      page: 1,
      limit: 4,
      startDate,
    });
  const { data: latestPosts, isLoading: isLoadingPosts } =
    api.posts.getAll.useQuery({
      page: 1,
      limit: 3,
    });

  return (
    <div>
      <section className="bg-primary relative flex h-[50vh] items-center justify-center md:h-[60vh] lg:h-[70vh]">
        {/* Gradient Overlay für bessere Lesbarkeit */}
        <div className="absolute inset-0 bg-linear-to-b from-black/30 to-black/50" />

        <div className="relative z-10 container px-4 text-center text-white">
          <h1 className="mb-4 text-3xl font-bold md:mb-6 md:text-5xl lg:text-6xl">
            Posaunenwerk Rheinland
          </h1>
          <p className="mx-auto mb-6 max-w-2xl text-lg md:mb-8 md:text-xl lg:text-2xl">
            Gemeinsam Musik machen, Glauben leben
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/mitmachen"
              className="bg-primary hover:bg-primary-dark rounded-lg px-6 py-3 font-semibold text-white shadow-lg"
            >
              Jetzt mitmachen
            </Link>
            <Link
              href="/termine"
              className="rounded-lg border-2 border-white bg-transparent px-6 py-3 font-semibold text-white shadow-lg hover:bg-white/10"
            >
              Termine ansehen
            </Link>
          </div>
        </div>
      </section>
      {/* Termine Section */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <SectionHeader
            title="Kommende Termine"
            linkText="Alle Termine"
            linkHref="/termine"
          />

          {isLoadingEvents ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner text="Lade Termine..." />
            </div>
          ) : upcomingEvents?.events && upcomingEvents.events.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {upcomingEvents.events.map((event) => (
                <EventCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  date={event.eventDate}
                  location={event.location?.city || ""}
                  category={event.category}
                  district={event.bezirk?.number}
                  cancelled={event.cancelled}
                  coverImageUrl={event.coverImage?.url}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">
              Aktuell keine Termine verfügbar.
            </p>
          )}
        </div>
      </section>

      {/* News Section */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <SectionHeader
            title="Aktuelles"
            linkText="Alle News"
            linkHref="/aktuelles"
          />

          {isLoadingPosts ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner text="Lade Neuigkeiten..." />
            </div>
          ) : latestPosts?.posts && latestPosts.posts.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              {latestPosts.posts.map((post) => (
                <PostCard
                  key={post.id}
                  id={post.id}
                  title={post.title}
                  excerpt={post.excerpt || ""}
                  date={post.publishedAt || post.createdAt}
                  category={post.category}
                  image={post.coverImage?.url}
                  pinned={post.pinned}
                  district={post.bezirk?.number}
                  content={post.content}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">
              Aktuell keine News verfügbar.
            </p>
          )}
        </div>
      </section>

      {/* Förderverein Teaser */}
      <section className="bg-foerderverein dark:bg-foerderverein-dark py-12 text-white md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-block rounded-full bg-white/10 p-3">
              <Building2 className="h-12 w-12" />
            </div>
            <h2 className="mb-6 text-2xl font-bold md:text-3xl lg:text-4xl">
              Förderverein – Gemeinsam stark für die Posaunenchormusik
            </h2>
            <p className="mx-auto mb-8 max-w-3xl text-lg leading-relaxed opacity-95 md:text-xl">
              Seit 2008 unterstützt unser Förderverein die Arbeit des
              Posaunenwerks: von Auswahlchören über Lehrgänge bis zu
              CD-Produktionen. Werden Sie Teil unserer Gemeinschaft!
            </p>

            <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
                <div className="mb-2 text-3xl font-bold">36 €</div>
                <p className="text-sm opacity-90">Jahresbeitrag</p>
              </div>
              <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
                <div className="mb-2 text-3xl font-bold">2025</div>
                <p className="text-sm opacity-90">
                  Geschenk-CD für Neumitglieder
                </p>
              </div>
              <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
                <div className="mb-2 text-3xl font-bold">1.000 €</div>
                <p className="text-sm opacity-90">
                  p.a. für Lehrgangsförderung
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/foerderverein"
                className="text-foerderverein inline-flex items-center justify-center rounded-lg bg-white px-8 py-3 font-bold shadow-lg transition-colors hover:bg-gray-100"
              >
                Mehr erfahren
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
              <a
                href="mailto:foerderverein@posaunenwerk-rheinland.de?subject=Mitgliedschaft im Förderverein"
                className="inline-flex items-center justify-center rounded-lg border-2 border-white bg-transparent px-8 py-3 font-semibold text-white transition-colors hover:bg-white/10"
              >
                Mitglied werden
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Spacing Section für sanfteren Übergang */}
      <section className="bg-background dark:bg-dark-background py-8 md:py-12"></section>

      {/* CTA Section */}
      <section className="bg-primary dark:bg-primary-dark py-12 text-white md:py-16 lg:py-20">
        <div className="container text-center">
          <h2 className="mb-4 text-2xl font-bold md:text-3xl lg:text-4xl">
            Lust auf Posaunenchor?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg md:text-xl">
            Finde einen Chor in deiner Nähe oder erfahre mehr über unsere Aus-
            und Weiterbildungsangebote
          </p>
          <Link
            href="/mitmachen"
            className="text-dark dark:text-dark-background dark:bg-dark-text inline-block rounded-lg bg-white px-8 py-3 font-semibold transition-colors hover:bg-gray-100 dark:hover:bg-gray-200"
          >
            Mehr erfahren
          </Link>
        </div>
      </section>
    </div>
  );
}
