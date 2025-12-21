"use client";

import { useEffect, useState } from "react";
import { useBanner } from "../ui/banner-context";

interface PageHeaderProps {
  title: string;
  color?:
    | "primary"
    | "primary-dark"
    | "foerderverein"
    | "dark"
    | "district-1"
    | "district-2"
    | "district-3"
    | "district-4"
    | "district-5"
    | "district-6"
    | "district-7"
    | "district-8"
    | "district-9"
    | "district-10"
    | "district-11"
    | "district-12"
    | "district-13";
}

export default function PageHeader({
  title,
  color = "primary",
}: PageHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [topPosition, setTopPosition] = useState(64);
  const { bannerHeight } = useBanner();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };

    const updateTopPosition = () => {
      // 64px (top-16) on mobile, 80px (top-20) on desktop
      const baseTop = window.innerWidth >= 768 ? 80 : 64;
      setTopPosition(baseTop + bannerHeight);
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", updateTopPosition);
    updateTopPosition(); // Initial calculation

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateTopPosition);
    };
  }, [bannerHeight]);

  const colorClasses = {
    primary: "bg-primary",
    "primary-dark": "bg-primary-dark",
    foerderverein: "bg-foerderverein",
    dark: "bg-dark",
    "district-1": "bg-district-1",
    "district-2": "bg-district-2",
    "district-3": "bg-district-3",
    "district-4": "bg-district-4",
    "district-5": "bg-district-5",
    "district-6": "bg-district-6",
    "district-7": "bg-district-7",
    "district-8": "bg-district-8",
    "district-9": "bg-district-9",
    "district-10": "bg-district-10",
    "district-11": "bg-district-11",
    "district-12": "bg-district-12",
    "district-13": "bg-district-13",
  };

  return (
    <div
      className={`fixed right-0 left-0 z-40 transition-all duration-300 ${
        isScrolled ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      }`}
      style={{
        top: `${topPosition}px`,
      }}
    >
      <div
        className={`${colorClasses[color]} h-12 text-white shadow-md md:h-16`}
      >
        <div className="container flex h-full items-center">
          <h1 className="truncate text-lg font-bold md:text-xl">{title}</h1>
        </div>
      </div>
    </div>
  );
}
