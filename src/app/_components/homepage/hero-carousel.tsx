"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselItem {
  id: string;
  media: {
    url: string;
    alt: string | null;
    name: string;
  };
  title: string | null;
  subtitle: string | null;
}

interface HeroCarouselProps {
  items: CarouselItem[];
  defaultTitle: string;
  defaultSubtitle: string;
}

export default function HeroCarousel({
  items,
  defaultTitle,
  defaultSubtitle,
}: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-advance carousel
  useEffect(() => {
    if (!isAutoPlaying || items.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying, items.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToPrevious = () => {
    goToSlide((currentIndex - 1 + items.length) % items.length);
  };

  const goToNext = () => {
    goToSlide((currentIndex + 1) % items.length);
  };

  const currentItem = items[currentIndex];
  if (!currentItem) {
    return null;
  }

  const displayTitle = currentItem.title || defaultTitle;
  const displaySubtitle = currentItem.subtitle || defaultSubtitle;

  return (
    <section className="bg-primary relative flex h-[50vh] items-center justify-center overflow-hidden md:h-[60vh] lg:h-[70vh]">
      {/* Background Images */}
      <div className="absolute inset-0">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={item.media.url}
              alt={item.media.alt || item.media.name}
              fill
              className="object-cover"
              priority={index === 0}
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/50" />
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {items.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 z-20 rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30 md:left-8"
            aria-label="Vorheriges Bild"
          >
            <ChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 z-20 rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30 md:right-8"
            aria-label="Nächstes Bild"
          >
            <ChevronRight className="h-6 w-6 md:h-8 md:w-8" />
          </button>
        </>
      )}

      {/* Content */}
      <div className="relative z-10 container px-4 text-center text-white">
        <h1 className="mb-4 text-3xl font-bold md:mb-6 md:text-5xl lg:text-6xl">
          {displayTitle}
        </h1>
        <p className="mx-auto mb-6 max-w-2xl text-lg md:mb-8 md:text-xl lg:text-2xl">
          {displaySubtitle}
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/mitmachen"
            className="bg-primary hover:bg-primary-dark rounded-lg px-6 py-3 font-semibold text-white shadow-lg"
          >
            Jetzt mitmachen
          </Link>
          <Link
            href="/termine"
            className="rounded-lg border-2 border-white bg-transparent px-6 py-3 font-semibold text-white shadow-lg hover:bg-white/10"
          >
            Termine ansehen
          </Link>
        </div>
      </div>

      {/* Dots Indicator */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "w-8 bg-white"
                  : "w-2 bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`Gehe zu Slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
