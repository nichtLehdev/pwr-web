"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import PublicPage from "@/app/_components/general/public-page";
import { PageSection } from "@/app/_components/programmheft/page-section";
import { Heading } from "@/app/_components/programmheft/section-head";
import { NewsColumns } from "@/app/_components/programmheft/news";
import { FilterIcon, PinIcon, XCircleIcon, Rss } from "lucide-react";
import FeedConfigModal from "@/app/_components/feeds/feed-config-modal";
import { useBanner } from "@/app/_components/ui/banner-context";
import { useStickyTop } from "@/lib/use-sticky-top";
import { cn } from "@/lib/utils";

type PostWithRelations = RouterOutputs["posts"]["getAll"]["posts"][number];
type FilterCategory = PostWithRelations["category"] | "all";

const TOOLBAR_BUTTON =
  "semi-condensed inline-flex min-h-11 items-center justify-center gap-2 border-2 px-3 text-sm font-semibold transition-colors";
const TOOLBAR_BUTTON_OFF =
  "border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night";
const TOOLBAR_BUTTON_ON = "border-ink bg-primary text-ink";
const FIELD_LABEL =
  "semi-condensed text-ink dark:text-night-text mb-2 block text-sm font-semibold";

export default function AktuellesClient() {
  const { bannerHeight } = useBanner();
  const stickyTop = useStickyTop(bannerHeight);

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
      // Sort by the displayed date (publishedAt, falling back to createdAt).
      const dateA = new Date(a.publishedAt ?? a.createdAt);
      const dateB = new Date(b.publishedAt ?? b.createdAt);
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

  const resetFilters = () => {
    setSelectedCategory("all");
    setSelectedDistrict("all");
  };

  if (isLoading) {
    return (
      <PublicPage
        title="Aktuelles"
        breadcrumbs={[{ label: "Start", href: "/" }, { label: "Aktuelles" }]}
        stickyTitle={false}
      >
        <PageSection flush="top">
          <p className="text-dark dark:text-night-muted py-12 text-center text-lg">
            Lade Beiträge...
          </p>
        </PageSection>
      </PublicPage>
    );
  }

  return (
    <PublicPage
      title="Aktuelles"
      breadcrumbs={[{ label: "Start", href: "/" }, { label: "Aktuelles" }]}
      description={<p>News, Berichte und Ankündigungen aus dem Posaunenwerk</p>}
      // Die Filterleiste dieser Seite trägt den Kolumnentitel bereits.
      stickyTitle={false}
    >
      {/* Filter Bar */}
      <section
        className="bg-paper dark:bg-night border-rule dark:border-night-rule sticky z-20 border-b"
        style={{ top: `${stickyTop}px` }}
      >
        <div className="sheet py-3">
          {/* Mobile: Compact Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-4">
              {/* Kolumnentitel: sagt beim Scrollen, auf welcher Seite des
                  Hefts man steht — und füllt den Platz, den die Leiste unter
                  der Navigation ohnehin einnimmt. */}
              <p className="condensed text-ink dark:text-night-text hidden text-xl leading-none font-bold lg:block">
                Aktuelles
              </p>
              {/* Left: Results Count */}
              <p className="text-dark dark:text-night-muted text-sm">
                {totalFiltered} {totalFiltered === 1 ? "Beitrag" : "Beiträge"}
                {hasActiveFilters && (
                  <span className="text-primary-ink dark:text-primary ml-1 font-semibold">
                    (gefiltert)
                  </span>
                )}
              </p>
            </div>

            {/* Right: RSS Feed & Filter Toggle Button */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setRssModalOpen(true)}
                className="semi-condensed text-ink hover:bg-ink hover:text-paper dark:text-night-text dark:hover:bg-night-text dark:hover:text-night inline-flex min-h-11 items-center gap-2 px-3 text-sm font-semibold transition-colors"
                aria-label="RSS Feed"
                title="RSS Feed abonnieren"
              >
                <Rss className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">RSS</span>
              </button>
              {!filtersOpen && hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-dark hover:text-ink dark:text-night-muted dark:hover:text-night-text inline-flex min-h-11 min-w-11 items-center justify-center transition-colors"
                  aria-label="Filter zurücksetzen"
                >
                  <XCircleIcon className="h-5 w-5" aria-hidden />
                </button>
              )}
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                aria-expanded={filtersOpen}
                className={cn(
                  TOOLBAR_BUTTON,
                  "relative min-w-11",
                  filtersOpen ? TOOLBAR_BUTTON_ON : TOOLBAR_BUTTON_OFF,
                )}
                aria-label="Filter öffnen"
              >
                <FilterIcon className="h-4 w-4" aria-hidden />
                {/* Active Filter Badge */}
                {hasActiveFilters && (
                  <span
                    aria-hidden
                    className="bg-primary-ink dark:bg-primary absolute -top-1 -right-1 h-2.5 w-2.5"
                  />
                )}
              </button>
            </div>
          </div>

          {/* Collapsible Filter Panel */}
          {filtersOpen && (
            <div className="border-rule dark:border-night-rule mt-3 space-y-4 border-t pt-4">
              {/* Category Filter */}
              <div>
                <span className={FIELD_LABEL}>Kategorie</span>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        TOOLBAR_BUTTON,
                        selectedCategory === cat
                          ? TOOLBAR_BUTTON_ON
                          : TOOLBAR_BUTTON_OFF,
                      )}
                    >
                      {categoryLabels[cat]}
                    </button>
                  ))}
                </div>
              </div>

              {/* District Filter */}
              <div>
                <label htmlFor="bezirk-filter" className={FIELD_LABEL}>
                  Bezirk
                </label>
                <select
                  id="bezirk-filter"
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="border-ink dark:border-night-text text-ink dark:text-night-text bg-paper dark:bg-night w-full border-2 px-3 py-2 text-sm"
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
                  onClick={resetFilters}
                  className="semi-condensed text-primary-ink dark:text-primary inline-flex min-h-11 w-full items-center justify-center text-sm font-semibold underline-offset-4 hover:underline"
                >
                  Filter zurücksetzen
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Content */}
      <PageSection>
        {/* Pinned Posts */}
        {filteredPinned.length > 0 && (
          <div>
            <Heading
              as="h2"
              size="list"
              rule
              className="flex items-center gap-2"
            >
              <PinIcon className="h-5 w-5 shrink-0" aria-hidden />
              Angepinnte Beiträge
            </Heading>
            <NewsColumns posts={filteredPinned} />
          </div>
        )}

        {/* Regular Posts */}
        {sortedRegular.length > 0 && (
          <div className={filteredPinned.length > 0 ? "mt-16" : undefined}>
            {filteredPinned.length > 0 && (
              <Heading as="h2" size="list" rule>
                Alle Beiträge
              </Heading>
            )}
            <NewsColumns posts={sortedRegular} />
          </div>
        )}

        {/* No Results */}
        {totalFiltered === 0 && (
          <div className="border-ink dark:border-night-text border-t-2 py-8 text-center">
            <p className="text-dark dark:text-night-muted text-lg">
              Keine Beiträge gefunden.
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="semi-condensed text-primary-ink dark:text-primary mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline"
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        )}
      </PageSection>

      {/* RSS Feed Modal */}
      <FeedConfigModal
        isOpen={rssModalOpen}
        onClose={() => setRssModalOpen(false)}
        feedType="rss"
      />
    </PublicPage>
  );
}
