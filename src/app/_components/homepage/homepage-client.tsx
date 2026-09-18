"use client";

import { api } from "@/trpc/react";
import { ClosingCall } from "@/app/_components/programmheft/closing-call";
import Titelblatt from "@/app/_components/homepage/titelblatt";
import Programm from "@/app/_components/homepage/programm";
import Mitteilungen from "@/app/_components/homepage/mitteilungen";
import Register from "@/app/_components/homepage/register";

/**
 * `startDate` comes from the server: it is part of the events query key, and a client
 * timestamp would never match the prefetched key. Also "now" for the deadline texts.
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

      {/* Volle orange Fläche: ausdrücklich so gewünscht. */}
      <ClosingCall
        id="mitmachen-heading"
        title="Lust auf Posaunenchor?"
        text="Finde einen Chor in deiner Nähe oder erfahre mehr über unsere Aus- und Weiterbildungsangebote"
        actions={[{ href: "/mitmachen", label: "Mehr erfahren" }]}
      />
    </div>
  );
}
