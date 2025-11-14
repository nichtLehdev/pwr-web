"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    const handleScroll = () => {
      // Zeige den Header, wenn die Navigation aus dem Viewport ist (ca. 80px)
      setIsScrolled(window.scrollY > 80);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      className={`fixed top-16 md:top-20 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      }`}
    >
      <div
        className={`${colorClasses[color]} text-white h-12 md:h-16 shadow-md`}
      >
        <div className="container h-full flex items-center">
          <h1 className="text-lg md:text-xl font-bold truncate">{title}</h1>
        </div>
      </div>
    </div>
  );
}
