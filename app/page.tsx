import Link from 'next/link';
import HeroSection from '@/components/HeroSection';
import SectionHeader from '@/components/SectionHeader';
import EventCard from '@/components/EventCard';
import NewsCard from '@/components/NewsCard';
import { getUpcomingEvents, getLatestPosts } from '@/lib/mockData';

export default function Home() {
  // Mock Daten holen (später von Strapi)
  const upcomingEvents = getUpcomingEvents(3);
  const latestPosts = getLatestPosts(2);

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {latestPosts.map((post) => (
                <NewsCard 
                  key={post.id} 
                  id={post.id}
                  title={post.title}
                  excerpt={post.excerpt || ''}
                  date={post.publishedAt || post.createdAt}
                  category={post.category}
                  image={post.coverImage?.url}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-600">Aktuell keine News verfügbar.</p>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-primary text-white">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
            Lust auf Posaunenchor?
          </h2>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            Finde einen Chor in deiner Nähe oder erfahre mehr über unsere Aus- und Weiterbildungsangebote
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