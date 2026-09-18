import Image from "next/image";
import type { ReactNode } from "react";
import { Mail } from "lucide-react";
import type { Media } from "~/generated/prisma/client";
import { cn } from "@/lib/utils";
import ZoomableImage from "@/app/_components/general/zoomable-image";

const COLUMNS = {
  1: "",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
} as const;

/** Personen als Registerzeilen mit Haarlinien, mehrspaltig. */
export function PersonList({
  columns = 3,
  labelledBy,
  className,
  children,
}: {
  columns?: keyof typeof COLUMNS;
  labelledBy?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <ul
      aria-labelledby={labelledBy}
      className={cn("grid gap-x-10", COLUMNS[columns], className)}
    >
      {children}
    </ul>
  );
}

interface PersonRowProps {
  name: string;
  /** Amt oder Zuständigkeit, steht unter dem Namen. */
  role?: ReactNode;
  image?: Pick<Media, "url" | "alt" | "copyright" | "creator"> | null;
  email?: string | null;
}

/**
 * Personenzeile (ersetzt `PeopleCard`): rundes Foto (einzige Rundung im
 * Heft), Name in der Titelstimme, Amt darunter, E-Mail als Textlink.
 */
export function PersonRow({ name, role, image, email }: PersonRowProps) {
  const credit = image
    ? [image.copyright, image.creator].filter(Boolean).join(" · ")
    : "";

  return (
    <li className="border-rule dark:border-night-rule flex items-start gap-4 border-b py-4">
      {image ? (
        // Vergrößerbar ohne Lupe: Bei 56px deckte sie das halbe Gesicht zu.
        <ZoomableImage
          src={image.url}
          alt={image.alt || name}
          copyright={image.copyright}
          creator={image.creator}
          hint={false}
          className="bg-rule dark:bg-night-rule h-14 w-14 shrink-0 overflow-hidden rounded-full"
        >
          <Image
            src={image.url}
            alt={image.alt || name}
            fill
            sizes="56px"
            className="object-cover"
          />
        </ZoomableImage>
      ) : null}
      <div className="min-w-0">
        <p className="condensed text-ink dark:text-night-text text-[1.375rem] leading-tight font-bold">
          {name}
        </p>
        {role ? (
          <p className="text-dark dark:text-night-muted mt-0.5 text-[0.9375rem]">
            {role}
          </p>
        ) : null}
        {email ? (
          <a
            href={`mailto:${email}`}
            className="semi-condensed text-primary-ink dark:text-primary -my-1 inline-flex min-h-11 items-center gap-2 text-base font-semibold underline-offset-4 hover:underline"
          >
            <Mail className="h-4 w-4 shrink-0" aria-hidden />
            E-Mail senden
            <span className="sr-only"> an {name}</span>
          </a>
        ) : null}
        {credit ? (
          <p className="text-dark dark:text-night-muted mt-1 text-sm">
            <span className="sr-only">Bildnachweis: </span>
            {credit}
          </p>
        ) : null}
      </div>
    </li>
  );
}
