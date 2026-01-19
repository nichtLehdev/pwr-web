"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import {
  type Bezirk,
  type Post,
  PostCategory,
} from "~/generated/prisma/client";
import PageHeader from "../_components/general/page-header";
import PostCard from "../_components/posts/post-card";
import { FilterIcon, PinIcon, XCircleIcon, Rss } from "lucide-react";
import { CircleXIcon } from "lucide-react";
import FeedConfigModal from "../_components/feeds/feed-config-modal";
import { useBanner } from "../_components/ui/banner-context";

type FilterCategory = PostCategory | "all";

type PostWithRelations = Post & {
  bezirk: Bezirk | null;
  coverImage: { url: string } | null;
};

export default function AktuellesPage() {
  const { bannerHeight } = useBanner();
  const [filterBarTop, setFilterBarTop] = useState(112);

  useEffect(() => {
    // Store original overflow value
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const timer = setTimeout(() => {
      // Use empty string to remove inline style, allowing CSS to take over
      document.body.style.overflow = originalOverflow || "";
    }, 50);

    return () => {
      clearTimeout(timer);
      // Ensure overflow is restored on cleanup
      document.body.style.overflow = originalOverflow || "";
    };
  }, []);

  useEffect(() => {
    const updateFilterBarTop = () => {
      // Original values were top-28 (112px) mobile and md:top-36 (144px) desktop
      // We add bannerHeight to these original values
      const baseTop = window.innerWidth >= 768 ? 144 : 112;
      setFilterBarTop(baseTop);
    };

    updateFilterBarTop();
    window.addEventListener("resize", updateFilterBarTop);
    return () => window.removeEventListener("resize", updateFilterBarTop);
  }, []);

  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] =
    useState<FilterCategory>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [rssModalOpen, setRssModalOpen] = useState(false);

  const { data: postsData, isLoading: postsLoading } =
    api.posts.getAll.useQuery(
      { page: 1, limit: 100 },
      { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false },
    );

  const { data: bezirkeData, isLoading: bezirkeLoading } =
    api.bezirke.getAll.useQuery(undefined, {
      staleTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    });

  const isLoading = postsLoading || bezirkeLoading;

  const { pinnedPosts, regularPosts } = useMemo(() => {
    if (!postsData?.posts) return { pinnedPosts: [], regularPosts: [] };
    const pinned = postsData.posts.filter((post) => post.pinned);
    const regular = postsData.posts.filter((post) => !post.pinned);
    return { pinnedPosts: pinned, regularPosts: regular };
  }, [postsData]);

  const applyFilters = useMemo(() => {
    return (posts: PostWithRelations[]) => {
      return posts.filter((post) => {
        if (selectedDistrict !== "all") {
          if (selectedDistrict === "Bezirksübergreifend") {
            if (post.bezirk !== null) return false;
          } else {
            const match = selectedDistrict.match(/Bezirk (\d+)/);
            if (match?.[1]) {
              const districtNumber = parseInt(match[1], 10);
              if (post.bezirk?.number !== districtNumber) return false;
            }
          }
        }

        if (selectedCategory !== "all" && post.category !== selectedCategory) {
          return false;
        }

        return true;
      });
    };
  }, [selectedDistrict, selectedCategory]);

  const filteredPinned = useMemo(
    () => applyFilters(pinnedPosts),
    [applyFilters, pinnedPosts],
  );

  const filteredRegular = useMemo(
    () => applyFilters(regularPosts),
    [applyFilters, regularPosts],
  );

  const sortedRegular = useMemo(() => {
    return [...filteredRegular].sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
  }, [filteredRegular]);

  const districtSelectOptions = useMemo(() => {
    if (!bezirkeData) return ["all", "Bezirksübergreifend"];
    return [
      "all",
      "Bezirksübergreifend",
      ...bezirkeData
        .sort((a, b) => a.number - b.number)
        .map((b) => `Bezirk ${b.number} (${b.name})`),
    ];
  }, [bezirkeData]);

  const categories: FilterCategory[] = [
    "all",
    "MAGAZIN",
    "AUSBILDUNG",
    "EVENT",
    "BEZIRKE",
    "ANDERE",
  ];

  const categoryLabels: Record<FilterCategory, string> = {
    all: "Alle",
    MAGAZIN: "Magazin",
    EVENT: "Event",
    AUSBILDUNG: "Ausbildung",
    BEZIRKE: "Bezirke",
    ANDERE: "Sonstiges",
  };

  const totalFiltered = filteredPinned.length + sortedRegular.length;
  const hasActiveFilters =
    selectedDistrict !== "all" || selectedCategory !== "all";

  if (isLoading) {
    return (
      <div className="bg-background dark:bg-dark-background min-h-screen">
        <PageHeader title="Aktuelles" color="primary" />
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Lade Beiträge...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background dark:bg-dark-background min-h-screen">
      <PageHeader title="Aktuelles" color="primary" />

      {/* Header */}
      <section className="bg-primary dark:bg-primary-dark py-6 text-white md:py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <nav className="mb-4 flex items-center gap-2 text-sm opacity-90">
            <Link href="/" className="transition-colors hover:text-white">
              Start
            </Link>
            <span>/</span>
            <span>Aktuelles</span>
          </nav>
          <h1 className="mb-2 text-2xl font-bold md:mb-4 md:text-4xl lg:text-5xl">
            Aktuelles
          </h1>
          <p className="max-w-2xl text-sm md:text-lg lg:text-xl">
            News, Berichte und Ankündigungen aus dem Posaunenwerk
          </p>
        </div>
      </section>

      {/* Filter Bar */}
      <section
        className="dark:bg-dark-surface dark:border-dark-border sticky z-20 border-b bg-white shadow-sm"
        style={{
          top: `${bannerHeight + filterBarTop}px`,
        }}
      >
        <div className="container mx-auto px-4 py-3">
          {/* Mobile: Compact Row */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: Results Count */}
            <div className="flex-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {totalFiltered} {totalFiltered === 1 ? "Beitrag" : "Beiträge"}
                {hasActiveFilters && (
                  <span className="text-primary ml-1 font-semibold">
                    (gefiltert)
                  </span>
                )}
              </span>
            </div>

            {/* Right: RSS Feed & Filter Toggle Button */}
            <div className="flex gap-1">
              <button
                onClick={() => setRssModalOpen(true)}
                className="text-dark dark:text-dark-text dark:bg-dark-background-secondary dark:hover:bg-dark-background flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold transition-colors hover:bg-gray-200"
                aria-label="RSS Feed"
                title="RSS Feed abonnieren"
              >
                <Rss className="h-4 w-4" />
                <span className="hidden sm:inline">RSS</span>
              </button>
              {!filtersOpen && hasActiveFilters && (
                <button
                  onClick={() => {
                    setSelectedCategory("all");
                    setSelectedDistrict("all");
                  }}
                  aria-label="Filter zurücksetzen"
                >
                  <XCircleIcon className="h-5 w-5 text-gray-400 transition-colors hover:text-gray-600" />
                </button>
              )}
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={`relative cursor-pointer rounded-lg p-2 transition-colors ${
                  filtersOpen
                    ? "bg-primary text-white"
                    : "text-dark dark:text-dark-text dark:bg-dark-background-secondary dark:hover:bg-dark-background bg-gray-100 hover:bg-gray-200"
                }`}
                aria-label="Filter öffnen"
              >
                <FilterIcon className="h-4 w-4" />
                {/* Active Filter Badge */}
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-red-500"></span>
                )}
              </button>
            </div>
          </div>

          {/* Collapsible Filter Panel */}
          {filtersOpen && (
            <div className="animate-in slide-in-from-top-2 mt-3 space-y-3 border-t pt-4">
              {/* Category Filter */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Kategorie
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        selectedCategory === cat
                          ? "bg-dark dark:bg-primary text-white"
                          : "text-dark dark:text-dark-text dark:bg-dark-background-secondary dark:hover:bg-dark-border bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      {categoryLabels[cat]}
                    </button>
                  ))}
                </div>
              </div>

              {/* District Filter */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Bezirk
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="focus:ring-primary dark:border-dark-border dark:bg-dark-surface text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2"
                >
                  <option value="all">Alle Bezirke</option>
                  {districtSelectOptions.slice(1).map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset Button */}
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setSelectedCategory("all");
                    setSelectedDistrict("all");
                  }}
                  className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary w-full px-3 py-2 text-sm font-semibold transition-colors"
                >
                  Filter zurücksetzen
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="py-6 md:py-12">
        <div className="container mx-auto px-4">
          {/* Pinned Posts */}
          {filteredPinned.length > 0 && (
            <div className="mb-12">
              <h2 className="text-dark dark:text-dark-text border-primary mb-4 flex items-center gap-2 border-b-2 pb-2 text-lg font-bold md:mb-6 md:text-2xl">
                <PinIcon className="text-primary dark:text-primary-light h-5 w-5 md:h-6 md:w-6" />
                Angepinnte Beiträge
              </h2>
              <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {filteredPinned.map((post) => (
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
            </div>
          )}

          {/* Regular Posts */}
          {sortedRegular.length > 0 && (
            <div>
              {filteredPinned.length > 0 && (
                <h2 className="text-dark dark:text-dark-text dark:border-dark-border mb-4 border-b-2 border-gray-200 pb-2 text-lg font-bold md:mb-6 md:text-2xl">
                  Alle Beiträge
                </h2>
              )}
              <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {sortedRegular.map((post) => (
                  <PostCard
                    key={post.id}
                    id={post.id}
                    title={post.title}
                    excerpt={post.excerpt || ""}
                    date={post.publishedAt || post.createdAt}
                    category={post.category}
                    image={post.coverImage?.url}
                    pinned={false}
                    district={post.bezirk?.number}
                    content={post.content}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {totalFiltered === 0 && (
            <div className="py-12 text-center">
              <CircleXIcon className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              <p className="mb-4 text-base text-gray-600 md:text-lg dark:text-gray-400">
                Keine Beiträge gefunden.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setSelectedCategory("all");
                    setSelectedDistrict("all");
                  }}
                  className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary font-semibold"
                >
                  Filter zurücksetzen
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* RSS Feed Modal */}
      <FeedConfigModal
        isOpen={rssModalOpen}
        onClose={() => setRssModalOpen(false)}
        feedType="rss"
      />
    </div>
  );
}
