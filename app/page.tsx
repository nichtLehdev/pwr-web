import Link from "next/link";
import HeroSection from "@/components/HeroSection";
import SectionHeader from "@/components/SectionHeader";
import EventCard from "@/components/EventCard";
import NewsCard from "@/components/NewsCard";
import { getUpcomingEvents, getLatestPosts } from "@/lib/mockData";

export default function Home() {
  // Mock Daten holen (später von Strapi)
  const upcomingEvents = getUpcomingEvents(4);
  const latestPosts = getLatestPosts(3);

  return (
    <div>
      <HeroSection />

      {/* Termine Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <SectionHeader
            title="Kommende Termine"
            linkText="Alle Termine"
            linkHref="/termine"
          />

          {upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {upcomingEvents.map((event) => (
                <EventCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  date={event.eventDate}
                  location={event.location.city}
                  category={event.category}
                  district={event.districtInfo.name}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-600">Aktuell keine Termine verfügbar.</p>
          )}
        </div>
      </section>

      {/* News Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-background-secondary">
        <div className="container">
          <SectionHeader
            title="Aktuelles"
            linkText="Alle News"
            linkHref="/aktuelles"
          />

          {latestPosts.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {latestPosts.map((post) => (
                <NewsCard
                  key={post.id}
                  id={post.id}
                  title={post.title}
                  excerpt={post.excerpt || ""}
                  date={post.publishedAt || post.createdAt}
                  category={post.category}
                  image={post.coverImage?.url}
                  pinned={post.pinned}
                  district={post.districtInfo?.name}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-600">Aktuell keine News verfügbar.</p>
          )}
        </div>
      </section>

      {/* Förderverein Teaser */}
      <section className="py-12 md:py-16 lg:py-20 bg-foerderverein text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block p-3 bg-white/10 rounded-full mb-6">
              <svg
                className="w-12 h-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                />
              </svg>
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6">
              Förderverein – Gemeinsam stark für die Posaunenchormusik
            </h2>
            <p className="text-lg md:text-xl mb-8 leading-relaxed opacity-95 max-w-3xl mx-auto">
              Seit 2008 unterstützt unser Förderverein die Arbeit des
              Posaunenwerks: von Auswahlchören über Lehrgänge bis zu
              CD-Produktionen. Werden Sie Teil unserer Gemeinschaft!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <div className="text-3xl font-bold mb-2">36 €</div>
                <p className="text-sm opacity-90">Jahresbeitrag für Chöre</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <div className="text-3xl font-bold mb-2">2025</div>
                <p className="text-sm opacity-90">
                  Geschenk-CD für Neumitglieder
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <div className="text-3xl font-bold mb-2">1.000 €</div>
                <p className="text-sm opacity-90">
                  p.a. für Lehrgangsförderung
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/foerderverein"
                className="inline-flex items-center justify-center px-8 py-3 bg-white text-foerderverein font-bold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
              >
                Mehr erfahren
                <svg
                  className="w-5 h-5 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
              <a
                href="mailto:foerderverein@posaunenwerk-rheinland.de?subject=Mitgliedschaft im Förderverein"
                className="inline-flex items-center justify-center px-8 py-3 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
              >
                Mitglied werden
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Spacing Section für sanfteren Übergang */}
      <section className="py-8 md:py-12 bg-background"></section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-primary text-white">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
            Lust auf Posaunenchor?
          </h2>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            Finde einen Chor in deiner Nähe oder erfahre mehr über unsere Aus-
            und Weiterbildungsangebote
          </p>
          <Link
            href="/mitmachen"
            className="inline-block px-8 py-3 bg-white text-dark font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Mehr erfahren
          </Link>
        </div>
      </section>
    </div>
  );
}
