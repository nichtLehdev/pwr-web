import Image from "next/image";
import type { ReactNode } from "react";
import { Mail, Phone } from "lucide-react";
import type { Media } from "~/generated/prisma/client";
import { cn } from "@/lib/utils";
import ZoomableImage from "@/app/_components/general/zoomable-image";

/** Textlink-Stimme wie bei `PersonContactRow`, wiederverwendet für Kontaktwege. */
const LINK =
  "semi-condensed text-primary-ink dark:text-primary inline-flex min-h-11 items-center gap-2 text-base font-semibold underline-offset-4 hover:underline";

/** Ohne Foto: helles Logo auf Tinte, wie bei Meldungen ohne Titelbild. */
function PortraitFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center px-8">
      <Image
        src="/images/logo-horizontal-dark.svg"
        alt=""
        width={200}
        height={56}
        className="h-auto w-2/5 max-w-[9rem]"
        unoptimized
      />
    </div>
  );
}

/** Bildfeld 3:4; mit Foto als Vergrößern-Button, ohne als Fläche mit Logo. */
const PORTRAIT_FRAME =
  "bg-ink dark:bg-night-raised relative aspect-[3/4] w-full overflow-hidden";

interface VorstandPortraitProps {
  name: string;
  role?: ReactNode;
  image?: Pick<Media, "url" | "alt" | "copyright" | "creator"> | null;
  email?: string | null;
  phone?: string | null;
}

/** Porträt in festem 3:4 über alle Karten, damit die Namen darunter in einer Zeile stehen. */
export function VorstandPortrait({
  name,
  role,
  image,
  email,
  phone,
}: VorstandPortraitProps) {
  const credit = image
    ? [image.copyright, image.creator].filter(Boolean).join(" · ")
    : "";

  return (
    <li className="flex flex-col">
      {image ? (
        <ZoomableImage
          src={image.url}
          alt={image.alt || name}
          copyright={image.copyright}
          creator={image.creator}
          className={PORTRAIT_FRAME}
        >
          <Image
            src={image.url}
            alt={image.alt || name}
            fill
            sizes="(min-width: 64rem) 30vw, (min-width: 40rem) 45vw, 90vw"
            className="object-cover"
          />
        </ZoomableImage>
      ) : (
        <div className={PORTRAIT_FRAME}>
          <PortraitFallback />
        </div>
      )}

      <div className="border-rule dark:border-night-rule mt-4 border-t pt-4">
        <p className="condensed text-ink dark:text-night-text text-[1.375rem] leading-tight font-bold">
          {name}
        </p>
        {role ? (
          <p className="text-dark dark:text-night-muted mt-0.5 text-[0.9375rem]">
            {role}
          </p>
        ) : null}
        {email || phone ? (
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
            {email ? (
              <a href={`mailto:${email}`} className={LINK}>
                <Mail className="h-4 w-4 shrink-0" aria-hidden />
                E-Mail senden
                <span className="sr-only"> an {name}</span>
              </a>
            ) : null}
            {phone ? (
              <a href={`tel:${phone.replace(/[^0-9+]/g, "")}`} className={LINK}>
                <Phone className="h-4 w-4 shrink-0" aria-hidden />
                {phone}
                <span className="sr-only"> anrufen</span>
              </a>
            ) : null}
          </div>
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

/** Raster für `VorstandPortrait`: 1/2/3 Spalten, großzügiger Zeilenabstand. */
export function VorstandPortraitGrid({
  labelledBy,
  className,
  children,
}: {
  labelledBy?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <ul
      aria-labelledby={labelledBy}
      className={cn(
        "grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-16",
        className,
      )}
    >
      {children}
    </ul>
  );
}
