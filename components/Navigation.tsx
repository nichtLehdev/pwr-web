"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownTimeout, setDropdownTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  const navLinks = [
    { href: "/", label: "Start" },
    { href: "/termine", label: "Termine" },
    { href: "/aktuelles", label: "Aktuelles" },
    {
      href: "/mitmachen",
      label: "Mitmachen",
      dropdown: [
        { href: "/mitmachen/chor-finden", label: "Chor finden" },
        { href: "/mitmachen/bildung", label: "Aus- und Weiterbildung" },
        { href: "/mitmachen/jungblaeser", label: "Jungbläserarbeit" },
        { href: "/mitmachen/ehrenamt", label: "Ehrenamtlich engagieren" },
      ],
    },
    {
      href: "/materialien",
      label: "Materialien",
      dropdown: [
        { href: "/materialien/uebungen", label: "Übungen & Tipps" },
        { href: "/materialien/blechblatt", label: "Rheinisches Blechblatt" },
        { href: "/materialien/literatur", label: "Literatur & CDs" },
      ],
    },
    {
      href: "/ueber-uns",
      label: "Über uns",
      dropdown: [
        { href: "/ueber-uns/struktur", label: "Struktur & Geschichte" },
        { href: "/ueber-uns/vorstand", label: "Vorstand" },
        { href: "/ueber-uns/auswahlchoere", label: "Auswahlchöre" },
        { href: "/ueber-uns/posaunenrat", label: "Posaunenrat" },
        { href: "/ueber-uns/namibia", label: "Namibia-Partnerschaft" },
      ],
    },
  ];

  const toggleDropdown = (label: string) => {
    setOpenDropdown(openDropdown === label ? null : label);
  };

  const handleMouseEnter = (label: string) => {
    if (dropdownTimeout) {
      clearTimeout(dropdownTimeout);
      setDropdownTimeout(null);
    }
    setOpenDropdown(label);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setOpenDropdown(null);
    }, 300); // 300ms delay before closing
    setDropdownTimeout(timeout);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white shadow-md z-50 w-full">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo - immer sichtbar */}
          <Link href="/" className="shrink-0">
            <div className="h-10 md:h-14 relative">
              {/* Desktop: Komplettes Logo mit Text */}
              <Image
                src="/images/logo-horizontal.svg"
                alt="Posaunenwerk Rheinland"
                width={250}
                height={56}
                className="hidden md:block h-full w-auto"
                priority
              />
              {/* Mobile: Nur Icon (optional, falls vorhanden) */}
              <Image
                src="/images/logo-icon.svg"
                alt="Posaunenwerk Rheinland"
                width={40}
                height={40}
                className="md:hidden h-full w-auto"
                priority
              />
            </div>
          </Link>

          {/* Desktop Navigation - ab md: sichtbar */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <div
                key={link.href}
                className="relative group"
                onMouseEnter={() =>
                  link.dropdown && handleMouseEnter(link.label)
                }
                onMouseLeave={() => link.dropdown && handleMouseLeave()}
              >
                {link.dropdown ? (
                  <>
                    <Link
                      href={link.href}
                      className="text-dark hover:text-primary transition-colors font-medium flex items-center gap-1"
                    >
                      {link.label}
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </Link>
                    {openDropdown === link.label && (
                      <div
                        className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50"
                        onMouseEnter={() =>
                          link.dropdown && handleMouseEnter(link.label)
                        }
                        onMouseLeave={() => link.dropdown && handleMouseLeave()}
                      >
                        {link.dropdown.map((sublink) => (
                          <Link
                            key={sublink.href}
                            href={sublink.href}
                            className="block px-4 py-2 text-dark hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            {sublink.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={link.href}
                    className="text-dark hover:text-primary transition-colors font-medium"
                  >
                    {link.label}
                  </Link>
                )}
              </div>
            ))}

            {/* Suche & Login */}
            <div className="flex items-center space-x-4 ml-4">
              <button
                className="text-dark hover:text-primary transition-colors"
                aria-label="Suchen"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>

              <Link
                href="/login"
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
              >
                Login
              </Link>
            </div>
          </div>

          {/* Mobile Menu Button - nur auf Mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-dark hover:bg-gray-100"
            aria-label="Menü öffnen"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu - slide down */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <div key={link.href}>
                  {link.dropdown ? (
                    <>
                      <div className="flex items-center">
                        <Link
                          href={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex-1 px-4 py-2 text-dark hover:bg-gray-100 hover:text-primary rounded-md transition-colors"
                        >
                          {link.label}
                        </Link>
                        <button
                          onClick={() => toggleDropdown(link.label)}
                          className="p-2 text-dark hover:bg-gray-100 rounded-md transition-colors"
                          aria-label={`${link.label} Untermenü öffnen`}
                        >
                          <svg
                            className={`w-5 h-5 transition-transform ${
                              openDropdown === link.label ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                      </div>
                      {openDropdown === link.label && (
                        <div className="ml-4 mt-1 space-y-1">
                          {link.dropdown.map((sublink) => (
                            <Link
                              key={sublink.href}
                              href={sublink.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-primary rounded-md transition-colors"
                            >
                              {sublink.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-2 text-dark hover:bg-gray-100 hover:text-primary rounded-md transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </div>
              ))}

              {/* Mobile Suche & Login */}
              <div className="px-4 pt-4 border-t border-gray-200 space-y-2">
                <button className="w-full px-4 py-2 text-dark hover:bg-gray-100 rounded-md flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Suchen
                </button>

                <Link
                  href="/login"
                  className="block w-full px-4 py-2 bg-primary text-white rounded-md text-center hover:bg-primary-dark transition-colors"
                >
                  Login
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
