"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import SectionHeader from "./_components/section-header";
import EventCard from "./_components/events/event-card";
import PostCard from "./_components/posts/post-card";
import { api } from "@/trpc/react";
import LoadingSpinner from "./_components/general/loading-spinner";
import MediaCredit from "./_components/general/media-credit";
import { extractPlainTextFromMarkdown } from "@/lib/utils";
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
  CalendarDays,
  MapPin,
  ChevronRight,
} from "lucide-react";
import HeroCarousel from "./_components/homepage/hero-carousel";

export default function Home() {
  const startDate = useMemo(() => new Date(), []);

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
      limit: 8,
      upcoming: true,
    });

  const nextCourse = upcomingCourses?.courses?.[0];

  const nextCourseDescriptionExcerpt = nextCourse?.description
    ? extractPlainTextFromMarkdown(nextCourse.description, 5, 320)
    : "";

  const coursesOpenForRegistration =
    upcomingCourses?.courses
      ?.filter((course) => {
        if (!course.registrationOpen) {
          return false;
        }

        const now = new Date();
        const opensAt = course.registrationOpensAt
          ? new Date(course.registrationOpensAt)
          : null;
        const deadline = course.registrationDeadline
          ? new Date(course.registrationDeadline)
          : null;

        if (opensAt && opensAt > now) {
          return false;
        }

        if (deadline && deadline < now) {
          return false;
        }

        return true;
      })
      .filter((course) => course.id !== nextCourse?.id)
      .slice(0, 2) ?? [];

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
      {/* Termine Section */}
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
          ) : upcomingEvents?.events && upcomingEvents.events.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {upcomingEvents.events.map((event) => (
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
          ) : (
            <p className="text-gray-600 dark:text-gray-400">
              Aktuell keine Termine verfügbar.
            </p>
          )}
        </div>
      </section>

      {/* Kommende Lehrgänge Section */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <SectionHeader
            title="Kommende Lehrgänge"
            linkText="Alle Lehrgänge"
            linkHref="/termine?type=courses"
          />

          {isLoadingCourses ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner text="Lade Lehrgänge..." />
            </div>
          ) : nextCourse ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Link
                href={`/termine/course/${nextCourse.id}`}
                className="group bg-background dark:bg-dark-surface dark:border-dark-border hover:border-primary/40 flex flex-col overflow-hidden rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md lg:col-span-2 lg:flex-row lg:items-stretch"
              >
                <div className="relative aspect-[16/10] w-full shrink-0 lg:aspect-auto lg:w-[42%] lg:max-w-md lg:min-h-[280px]">
                  {nextCourse.image?.url ? (
                    <>
                      <Image
                        src={nextCourse.image.url}
                        alt={nextCourse.image.alt || nextCourse.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 40vw"
                      />
                      {(nextCourse.image.copyright ||
                        nextCourse.image.creator) && (
                        <div className="absolute right-2 bottom-2 flex justify-end">
                          <MediaCredit
                            copyright={nextCourse.image.copyright}
                            creator={nextCourse.image.creator}
                            showCreatorIcon
                            variant="light"
                            className="text-right text-white/90 drop-shadow-sm"
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="from-primary/20 to-primary/5 flex h-full min-h-[200px] w-full items-center justify-center bg-linear-to-br lg:min-h-full">
                      <GraduationCap
                        className="text-primary h-20 w-20 opacity-40"
                        aria-hidden
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <p className="text-primary mb-2 text-sm font-semibold">
                    Nächster Lehrgang
                  </p>
                  <h3 className="text-dark dark:text-dark-text mb-3 text-2xl font-bold">
                    {nextCourse.title}
                  </h3>

                  {nextCourseDescriptionExcerpt ? (
                    <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-5 text-sm leading-relaxed">
                      {nextCourseDescriptionExcerpt}
                    </p>
                  ) : null}

                  <div className="mb-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span>
                      {new Date(nextCourse.startDate).toLocaleDateString(
                        "de-DE",
                        {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        },
                      )}
                    </span>
                  </div>
                  <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{nextCourse.location?.city || "Ort folgt"}</span>
                  </div>

                  {nextCourse.instructors?.some((i) => i.profileImage?.url) ? (
                    <div className="mb-6 flex flex-wrap items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">
                        Leitung
                      </span>
                      <div className="flex -space-x-2">
                        {nextCourse.instructors
                          .filter((i) => i.profileImage?.url)
                          .slice(0, 4)
                          .map((instructor) => (
                            <Image
                              key={instructor.id}
                              src={instructor.profileImage!.url}
                              alt={instructor.displayName ?? ""}
                              width={40}
                              height={40}
                              className="border-background dark:border-dark-surface ring-background dark:ring-dark-surface h-10 w-10 rounded-full border-2 object-cover ring-2"
                            />
                          ))}
                      </div>
                    </div>
                  ) : null}
                  <p className="text-primary mt-auto inline-flex items-center text-sm font-semibold">
                    Details ansehen
                    <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </p>
                </div>
              </Link>

              <div className="flex flex-col gap-6">
                {coursesOpenForRegistration.length > 0 ? (
                  coursesOpenForRegistration.map((course) => (
                    <Link
                      key={course.id}
                      href={`/termine/course/${course.id}`}
                      className="group bg-background dark:bg-dark-surface dark:border-dark-border hover:border-primary/40 flex min-h-[140px] overflow-hidden rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md"
                    >
                      {course.image?.url ? (
                        <div className="relative w-28 shrink-0 sm:w-32">
                          <Image
                            src={course.image.url}
                            alt={course.image.alt || course.title}
                            fill
                            className="object-cover"
                            sizes="128px"
                          />
                        </div>
                      ) : null}
                      <div className="flex min-w-0 flex-1 flex-col p-5">
                        <p className="text-primary mb-2 text-xs font-semibold">
                          Anmeldung offen
                        </p>
                        <h4 className="text-dark dark:text-dark-text mb-2 line-clamp-2 text-lg font-semibold">
                          {course.title}
                        </h4>
                        <div className="mb-1 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <CalendarDays className="h-4 w-4 shrink-0" />
                          <span>
                            {new Date(course.startDate).toLocaleDateString(
                              "de-DE",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </span>
                        </div>
                        <p className="text-primary mt-auto inline-flex items-center text-sm font-semibold">
                          Anmelden
                          <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="bg-background dark:bg-dark-surface dark:border-dark-border rounded-xl border border-gray-200 p-5 text-sm text-gray-600 dark:text-gray-300">
                    Aktuell sind keine weiteren Lehrgänge mit offener Anmeldung
                    verfügbar.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">
              Aktuell keine Lehrgänge verfügbar.
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
