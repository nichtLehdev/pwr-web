import Image from "next/image";
import Link from "next/link";
import { type Media } from "~/generated/prisma/client";

interface PeopleCardProps {
  image?: Media;
  name: string;
  subtitle?: string;
  email?: string;
}

export default function PeopleCard({
  image,
  name,
  subtitle,
  email,
}: PeopleCardProps) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        {image && (
          <div className="relative my-auto h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-200">
            <Image
              src={image.url}
              alt={image.alt || name || "Profilbild"}
              fill
              className="object-cover"
            />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-dark font-semibold">{name}</p>
          <p className="text-sm text-gray-600">{subtitle}</p>
          {email && (
            <Link
              href={`mailto:${email}`}
              className="hover:text-primary flex items-center text-sm text-gray-700 transition-colors"
            >
              <svg
                className="mr-2 h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              E-Mail senden
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
