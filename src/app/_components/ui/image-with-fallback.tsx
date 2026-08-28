"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

/**
 * Theme-aware logo placeholder, shown wherever an image is missing or fails
 * to load — a designed fallback instead of a blank slab.
 */
export function LogoPlaceholder({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative flex h-full w-full items-center justify-center bg-gray-800 px-4 dark:bg-gray-100 ${className}`}
    >
      <Image
        src="/images/logo-horizontal-dark.svg"
        alt="Posaunenwerk Rheinland"
        width={200}
        height={56}
        className="h-auto w-auto max-w-[80%] dark:hidden"
        unoptimized
      />
      <Image
        src="/images/logo-horizontal.svg"
        alt="Posaunenwerk Rheinland"
        width={200}
        height={56}
        className="hidden h-auto w-auto max-w-[80%] dark:block"
        unoptimized
      />
    </div>
  );
}

type ImageWithFallbackProps = Omit<ImageProps, "src" | "onError"> & {
  src?: string | null;
  /** Custom fallback; defaults to the logo placeholder. */
  fallback?: React.ReactNode;
};

/**
 * next/image that renders a designed fallback when src is missing OR the
 * file fails to load (broken uploads, deleted media).
 */
export default function ImageWithFallback({
  src,
  fallback,
  alt,
  ...rest
}: ImageWithFallbackProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return <>{fallback ?? <LogoPlaceholder />}</>;
  }

  return (
    <Image src={src} alt={alt} onError={() => setFailedSrc(src)} {...rest} />
  );
}
