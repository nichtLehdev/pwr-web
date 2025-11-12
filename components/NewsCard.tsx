import Link from 'next/link';
import Image from 'next/image';

interface NewsCardProps {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  image?: string;
}

export default function NewsCard({ 
  id, 
  title, 
  excerpt, 
  date, 
  category,
  image
}: NewsCardProps) {
  return (
    <article className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow overflow-hidden flex flex-col h-full">
      {/* Beitragsbild */}
      {image && (
        <div className="relative w-full h-48 bg-gray-200">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover"
          />
        </div>
      )}
      
      <div className="p-6 flex flex-col flex-grow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-primary">
          {category}
        </span>
        <time className="text-xs text-gray-500">
          {new Date(date).toLocaleDateString('de-DE', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric' 
          })}
        </time>
      </div>

      <h3 className="text-xl font-bold text-dark mb-3">
        {title}
      </h3>

      <p className="text-gray-600 mb-4 line-clamp-3 flex-grow">
        {excerpt}
      </p>

      <Link 
        href={`/aktuelles/${id}`}
        className="inline-flex items-center text-primary hover:text-primary-dark font-semibold text-sm mt-auto"
      >
        Weiterlesen
        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
      </div>
    </article>
  );
}