"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { api } from "@/trpc/react";
import Titelblatt from "@/app/_components/homepage/titelblatt";
import Programm from "@/app/_components/homepage/programm";
import Mitteilungen from "@/app/_components/homepage/mitteilungen";
import Register from "@/app/_components/homepage/register";

/**
 * Startseite als Programmheft: Titelblatt und „Kommende Termine“ teilen sich
 * den ersten Bildschirm, danach Aktuelles, das Register und die Rückseite.
 *
 * `startDate` comes from the server rather than `new Date()` here: it is part
 * of the events query key, and a client-side timestamp would never match the
 * key the server prefetched under — every visit would refetch and the
 * server-rendered markup would be thrown away. It also serves as "now" for the
 * registration-deadline texts, so server and client render the same words.
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

  return (
    <div className="programm font-programm bg-paper text-ink dark:bg-night dark:text-night-text">
      <div className="titelblatt-min-h mx-auto grid max-w-[100rem] lg:grid-cols-12">
        <Titelblatt
          items={carouselItems ?? []}
          isLoading={isLoadingCarousel}
          defaultTitle="Posaunenwerk Rheinland"
          defaultSubtitle="Gemeinsam Musik machen, Glauben leben"
        />
        <Programm
          events={upcomingEvents?.events ?? []}
          courses={upcomingCourses?.courses ?? []}
          isLoading={isLoadingEvents || isLoadingCourses}
          now={startDate}
        />
      </div>

      <Mitteilungen
        posts={latestPosts?.posts ?? []}
        isLoading={isLoadingPosts}
      />

      <Register />

      {/* Rückseite des Hefts: volle orange Fläche als Blickfang —
          vom Eigentümer ausdrücklich so gewünscht. */}
      <section
        aria-labelledby="mitmachen-heading"
        className="on-orange bg-primary text-ink"
      >
        <div className="sheet py-16 md:py-24 lg:grid lg:grid-cols-12 lg:gap-10">
          <h2
            id="mitmachen-heading"
            className="condensed text-[clamp(2.5rem,6vw,5.25rem)] leading-[0.9] font-extrabold text-balance lg:col-span-6"
          >
            Lust auf Posaunenchor?
          </h2>
          <div className="mt-6 lg:col-span-5 lg:col-start-8 lg:mt-0 lg:self-end">
            <p className="max-w-[40ch] text-xl leading-relaxed">
              Finde einen Chor in deiner Nähe oder erfahre mehr über unsere Aus-
              und Weiterbildungsangebote
            </p>
            <Link
              href="/mitmachen"
              className="semi-condensed bg-ink text-paper hover:bg-paper hover:text-ink mt-8 inline-flex h-12 items-center gap-3 px-6 text-lg font-semibold transition-colors"
            >
              Mehr erfahren
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
