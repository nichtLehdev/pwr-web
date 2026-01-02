import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface SectionHeaderProps {
  title: string;
  linkText: string;
  linkHref: string;
}

export default function SectionHeader({
  title,
  linkText,
  linkHref,
}: SectionHeaderProps) {
  return (
    <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <h2 className="text-dark dark:text-dark-text text-2xl font-bold md:text-3xl lg:text-4xl">
        {title}
      </h2>
      <Link
        href={linkHref}
        className="text-primary hover:text-primary-dark flex items-center gap-2 font-semibold"
      >
        {linkText}
        <ArrowRight className="h-5 w-5" />
      </Link>
    </div>
  );
}
