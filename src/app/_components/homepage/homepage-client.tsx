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

      {/* Schlussseite des Hefts: auf Papier gesetzt, der Weg als volle Zeile —
          kein farbiges Aktionsband. */}
      <section
        aria-labelledby="mitmachen-heading"
        className="bg-paper dark:bg-night border-ink dark:border-night-rule border-t-2"
      >
        <div className="sheet py-16 md:py-20 lg:grid lg:grid-cols-12 lg:gap-10">
          <h2
            id="mitmachen-heading"
            className="condensed text-ink dark:text-night-text text-[clamp(2.5rem,5.5vw,4.75rem)] leading-[0.92] font-extrabold text-balance lg:col-span-6"
          >
            Lust auf Posaunenchor?
          </h2>
          <div className="mt-6 lg:col-span-6 lg:mt-0 lg:self-end">
            <p className="text-dark dark:text-night-muted max-w-[46ch] text-xl leading-relaxed">
              Finde einen Chor in deiner Nähe oder erfahre mehr über unsere Aus-
              und Weiterbildungsangebote
            </p>
            <ul className="border-ink dark:border-night-text mt-8 border-t-2">
              <li className="fill-row border-rule dark:border-night-rule border-b">
                <Link
                  href="/mitmachen"
                  className="condensed text-ink dark:text-night-text flex min-h-14 items-center justify-between gap-4 px-1 text-[1.5rem] font-bold"
                >
                  Mehr erfahren
                  <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
