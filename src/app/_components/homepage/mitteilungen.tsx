import {
  NewsColumns,
  type NewsPost,
} from "@/app/_components/programmheft/news";
import { PageSection } from "@/app/_components/programmheft/page-section";
import { SectionHead } from "@/app/_components/programmheft/section-head";

interface MitteilungenProps {
  posts: NewsPost[];
  isLoading: boolean;
}

/** „Aktuelles“ als Druckspalten mit Haarlinien statt als Karten. */
export default function Mitteilungen({ posts, isLoading }: MitteilungenProps) {
  return (
    <PageSection labelledBy="aktuelles-heading" rule>
      <SectionHead
        id="aktuelles-heading"
        title="Aktuelles"
        rule
        action={{ href: "/aktuelles", label: "Alle News" }}
      />
      <NewsColumns posts={posts} isLoading={isLoading} />
    </PageSection>
  );
}
