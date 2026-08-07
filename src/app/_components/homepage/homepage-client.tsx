"use client";

import Link from "next/link";
import SectionHeader from "@/app/_components/section-header";
import EventCard from "@/app/_components/events/event-card";
import PostCard from "@/app/_components/posts/post-card";
import { api } from "@/trpc/react";
import LoadingSpinner from "@/app/_components/general/loading-spinner";
import {
  Search,
  GraduationCap,
  Users,
  BookOpen,
  ExternalLink,
  Church,
  Music,
  FileText,
  UserCheck,
} from "lucide-react";
import HeroCarousel from "@/app/_components/homepage/hero-carousel";
import UpcomingCoursesCarousel from "@/app/_components/homepage/upcoming-courses-carousel";

/**
 * `startDate` comes from the server rather than `new Date()` here: it is part
 * of the events query key, and a client-side timestamp would never match the
 * key the server prefetched under — every visit would refetch and the
 * server-rendered markup would be thrown away.
 */
export default function HomepageClient({ startDate }: { startDate: Date }) {
  const { data: carouselItems, isLoading: isLoadingCarousel } =
    api.homepage.getCarouselItems.useQuery();

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

  const { data: upcomingCourses, isLoading: isLoadingCourses } =
    api.courses.getAll.useQuery({
      page: 1,
      limit: 100,
      upcoming: true,
    });

  const defaultTitle = "Posaunenwerk Rheinland";
  const defaultSubtitle = "Gemeinsam Musik machen, Glauben leben";

  return (
    <div>
      {/* Hero Section - Carousel or Fallback */}
      {isLoadingCarousel ? (
        <section className="bg-primary relative flex h-[50vh] items-center justify-center md:h-[60vh] lg:h-[70vh]">
          <div className="relative z-10 container px-4 text-center text-white">
            <LoadingSpinner text="Lade..." />
          </div>
        </section>
      ) : carouselItems && carouselItems.length > 0 ? (
        <HeroCarousel
          items={carouselItems}
          defaultTitle={defaultTitle}
          defaultSubtitle={defaultSubtitle}
        />
      ) : (
        <section className="bg-primary relative flex h-[50vh] items-center justify-center md:h-[60vh] lg:h-[70vh]">
          {/* Gradient Overlay für bessere Lesbarkeit */}
          <div className="absolute inset-0 bg-linear-to-b from-black/30 to-black/50" />

          <div className="relative z-10 container px-4 text-center text-white">
            <h1 className="mb-4 text-3xl font-bold md:mb-6 md:text-5xl lg:text-6xl">
              {defaultTitle}
            </h1>
            <p className="mx-auto mb-6 max-w-2xl text-lg md:mb-8 md:text-xl lg:text-2xl">
              {defaultSubtitle}
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
      )}
      {/* Termine Section — hidden entirely when there is nothing upcoming */}
      {(isLoadingEvents ||
        (upcomingEvents?.events && upcomingEvents.events.length > 0)) && (
        <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
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
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {upcomingEvents?.events.map((event) => (
                  <EventCard
                    key={event.id}
                    id={event.id}
                    title={event.title}
                    date={event.eventDate}
                    duration={event.duration}
                    location={event.location?.city || ""}
                    category={event.category}
                    district={event.bezirk?.number}
                    cancelled={event.cancelled}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* kommende Veranstaltungen Section — hidden entirely when empty */}
      {(isLoadingCourses ||
        (upcomingCourses?.courses && upcomingCourses.courses.length > 0)) && (
        <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
          <div className="container">
            <SectionHeader
              title="Kommende Veranstaltungen"
              linkText="Alle Veranstaltungen"
              linkHref="/termine?type=courses&view=list"
            />

            {isLoadingCourses ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner text="Lade Veranstaltungen..." />
              </div>
            ) : (
              <UpcomingCoursesCarousel
                courses={upcomingCourses?.courses ?? []}
              />
            )}
          </div>
        </section>
      )}

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
                  slug={post.slug}
                  title={post.title}
                  excerpt={post.excerpt || ""}
                  date={post.publishedAt || post.createdAt}
                  category={post.category}
                  image={post.coverImage?.url}
                  imagePositionX={post.coverImagePositionX}
                  imagePositionY={post.coverImagePositionY}
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

      {/* Popular Links Section */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-dark dark:text-dark-text mb-4 text-2xl font-bold md:text-3xl lg:text-4xl">
              Beliebte Seiten & Partner
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400">
              Entdecke unsere wichtigsten Seiten und Partnerorganisationen
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/mitmachen/chor-finden"
              className="group dark:bg-dark-surface dark:border-dark-border dark:hover:border-primary/50 hover:border-primary/50 flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-md transition-all hover:shadow-lg dark:border"
            >
              <div className="bg-primary/10 dark:bg-primary/20 text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-dark dark:text-dark-text mb-2 text-xl font-bold">
                Chor finden
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Finde einen Posaunenchor in deiner Nähe
              </p>
            </Link>

            <Link
              href="/mitmachen/bildung"
              className="group dark:bg-dark-surface dark:border-dark-border dark:hover:border-primary/50 hover:border-primary/50 flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-md transition-all hover:shadow-lg dark:border"
            >
              <div className="bg-primary/10 dark:bg-primary/20 text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="text-dark dark:text-dark-text mb-2 text-xl font-bold">
                Aus- und Weiterbildung
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Lehrgänge und Fortbildungen für Bläserinnen und Bläser
              </p>
            </Link>

            <Link
              href="/ueber-uns/auswahlchoere"
              className="group dark:bg-dark-surface dark:border-dark-border dark:hover:border-primary/50 hover:border-primary/50 flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-md transition-all hover:shadow-lg dark:border"
            >
              <div className="bg-primary/10 dark:bg-primary/20 text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-dark dark:text-dark-text mb-2 text-xl font-bold">
                Auswahlchöre
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Unsere Ensembles und Auswahlchöre
              </p>
            </Link>

            <Link
              href="/materialien/blechblatt"
              className="group dark:bg-dark-surface dark:border-dark-border dark:hover:border-primary/50 hover:border-primary/50 flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-md transition-all hover:shadow-lg dark:border"
            >
              <div className="bg-primary/10 dark:bg-primary/20 text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-dark dark:text-dark-text mb-2 text-xl font-bold">
                Rheinisches Blechblatt
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Unser Magazin für die Posaunenchorarbeit
              </p>
            </Link>

            <Link
              href="/ueber-uns/posaunenwarte"
              className="group dark:bg-dark-surface dark:border-dark-border dark:hover:border-primary/50 hover:border-primary/50 flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-md transition-all hover:shadow-lg dark:border"
            >
              <div className="bg-primary/10 dark:bg-primary/20 text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <UserCheck className="h-6 w-6" />
              </div>
              <h3 className="text-dark dark:text-dark-text mb-2 text-xl font-bold">
                Posaunenwarte
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Unsere Ansprechpartner in den Bezirken
              </p>
            </Link>

            <Link
              href="/materialien"
              className="group dark:bg-dark-surface dark:border-dark-border dark:hover:border-primary/50 hover:border-primary/50 flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-md transition-all hover:shadow-lg dark:border"
            >
              <div className="bg-primary/10 dark:bg-primary/20 text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-dark dark:text-dark-text mb-2 text-xl font-bold">
                Materialien
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Noten, CDs und weitere Materialien
              </p>
            </Link>

            <a
              href="https://www.ekir.de"
              target="_blank"
              rel="noopener noreferrer"
              className="group dark:bg-dark-surface dark:border-dark-border dark:hover:border-primary/50 hover:border-primary/50 flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-md transition-all hover:shadow-lg dark:border"
            >
              <div className="bg-primary/10 dark:bg-primary/20 text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <Church className="h-6 w-6" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-dark dark:text-dark-text mb-2 text-xl font-bold">
                  EKiR
                </h3>
                <ExternalLink className="group-hover:text-primary h-4 w-4 text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Evangelische Kirche im Rheinland
              </p>
            </a>

            <a
              href="https://www.epid.de"
              target="_blank"
              rel="noopener noreferrer"
              className="group dark:bg-dark-surface dark:border-dark-border dark:hover:border-primary/50 hover:border-primary/50 flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-md transition-all hover:shadow-lg dark:border"
            >
              <div className="bg-primary/10 dark:bg-primary/20 text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <Music className="h-6 w-6" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-dark dark:text-dark-text mb-2 text-xl font-bold">
                  EPiD
                </h3>
                <ExternalLink className="group-hover:text-primary h-4 w-4 text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Evangelischer Posaunendienst in Deutschland
              </p>
            </a>

            <a
              href="https://bundesmusikverband.de/"
              target="_blank"
              rel="noopener noreferrer"
              className="group dark:bg-dark-surface dark:border-dark-border dark:hover:border-primary/50 hover:border-primary/50 flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-md transition-all hover:shadow-lg dark:border"
            >
              <div className="bg-primary/10 dark:bg-primary/20 text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <Music className="h-6 w-6" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-dark dark:text-dark-text mb-2 text-xl font-bold">
                  BMCO
                </h3>
                <ExternalLink className="group-hover:text-primary h-4 w-4 text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Bundesverband Musik in der Kirche
              </p>
            </a>
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
