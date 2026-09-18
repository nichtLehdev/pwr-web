"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

/** Logo placeholder for images that are missing or fail to load. */
export function LogoPlaceholder({ className = "" }: { className?: string }) {
  return (
    // In beiden Modi dunkler Grund, daher genügt das helle Logo.
    <div
      className={`bg-ink dark:bg-night-raised relative flex h-full w-full items-center justify-center px-4 ${className}`}
    >
      <Image
        src="/images/logo-horizontal-dark.svg"
        alt="Posaunenwerk Rheinland"
        width={200}
        height={56}
        className="h-auto w-auto max-w-[80%]"
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

/** next/image with a fallback when src is missing OR the file fails to load. */
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
