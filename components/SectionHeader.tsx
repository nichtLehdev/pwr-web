import Link from 'next/link';

interface SectionHeaderProps {
  title: string;
  linkText: string;
  linkHref: string;
}

export default function SectionHeader({ title, linkText, linkHref }: SectionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
      <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark">
        {title}
      </h2>
      <Link 
        href={linkHref}
        className="text-primary hover:text-primary-dark font-semibold flex items-center gap-2"
      >
        {linkText}
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}