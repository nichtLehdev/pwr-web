/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signOut, useSession } from "@/lib/auth";

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownTimeout, setDropdownTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Use Better Auth's useSession hook directly
  const { data: session } = useSession();

  // Check if a link or its children are active
  const isActive = (href: string, dropdown?: Array<{ href: string }>) => {
    // Exact match for home
    if (href === "/" && pathname === "/") return true;

    // For other pages, check if pathname starts with href (and href is not "/")
    if (href !== "/" && pathname.startsWith(href)) return true;

    // Check if any dropdown item is active
    if (dropdown) {
      return dropdown.some((item) => pathname.startsWith(item.href));
    }

    return false;
  };

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
        { href: "/foerderverein", label: "Förderverein" },
        { href: "/ueber-uns/vorstand", label: "Vorstand" },
        { href: "/ueber-uns/posaunenwarte", label: "Posaunenwarte" },
        { href: "/ueber-uns/bezirke", label: "Bezirke & Obleute" },
        { href: "/ueber-uns/auswahlchoere", label: "Auswahlchöre" },
        { href: "/ueber-uns/posaunenrat", label: "Posaunenrat" },
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

  const handleLogout = async () => {
    await signOut();
    setUserMenuOpen(false);
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 w-full bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between lg:h-20">
          {/* Logo - immer sichtbar */}
          <Link href="/" className="shrink-0">
            <div className="relative h-10 lg:h-14">
              {/* Desktop: Komplettes Logo mit Text */}
              <Image
                src="/images/logo-horizontal.svg"
                alt="Posaunenwerk Rheinland"
                width={250}
                height={56}
                className="hidden h-full w-auto lg:block"
                priority
              />
              {/* Mobile: Nur Icon (optional, falls vorhanden) */}
              <Image
                src="/images/logo-icon.svg"
                alt="Posaunenwerk Rheinland"
                width={40}
                height={40}
                className="h-full w-auto lg:hidden"
                priority
              />
            </div>
          </Link>

          {/* Desktop Navigation - ab lg: sichtbar */}
          <div className="hidden items-center space-x-6 text-nowrap lg:flex">
            {navLinks.map((link) => (
              <div
                key={link.href}
                className="group relative"
                onMouseEnter={() =>
                  link.dropdown && handleMouseEnter(link.label)
                }
                onMouseLeave={() => link.dropdown && handleMouseLeave()}
              >
                {link.dropdown ? (
                  <>
                    <Link
                      href={link.href}
                      className={`flex items-center gap-1 font-medium transition-colors ${
                        isActive(link.href, link.dropdown)
                          ? "text-primary"
                          : "text-dark hover:text-primary"
                      }`}
                    >
                      {link.label}
                      <svg
                        className="h-4 w-4"
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
                        className="absolute top-full left-0 z-50 mt-2 w-64 rounded-lg border border-gray-100 bg-white py-2 shadow-xl"
                        onMouseEnter={() =>
                          link.dropdown && handleMouseEnter(link.label)
                        }
                        onMouseLeave={() => link.dropdown && handleMouseLeave()}
                      >
                        {link.dropdown.map((sublink) => (
                          <Link
                            key={sublink.href}
                            href={sublink.href}
                            className={`block px-4 py-2 transition-colors ${
                              pathname === sublink.href
                                ? "bg-primary/10 text-primary font-semibold"
                                : "text-dark hover:bg-primary/10 hover:text-primary"
                            }`}
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
                    className={`font-medium transition-colors ${
                      isActive(link.href)
                        ? "text-primary"
                        : "text-dark hover:text-primary"
                    }`}
                  >
                    {link.label}
                  </Link>
                )}
              </div>
            ))}

            {/* Suche & Login/User Menu */}
            <div className="ml-4 flex items-center space-x-4">
              <button
                className="text-dark hover:text-primary transition-colors"
                aria-label="Suchen"
              >
                <svg
                  className="h-5 w-5"
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

              {session?.user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 rounded-md p-2 transition-colors hover:bg-gray-100"
                  >
                    <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white">
                      {getInitials(session.user.name || session.user.email)}
                    </div>
                    <span className="text-dark text-sm font-medium">
                      Hi,{" "}
                      {(session.user as any).firstName ||
                        session.user.name?.split(" ")[0] ||
                        "User"}
                    </span>
                    <svg
                      className={`text-dark h-4 w-4 transition-transform ${
                        userMenuOpen ? "rotate-180" : ""
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

                  {userMenuOpen && (
                    <div className="absolute top-full right-0 z-50 mt-2 w-48 rounded-lg border border-gray-100 bg-white py-2 shadow-xl">
                      <Link
                        href="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="text-dark hover:bg-primary/10 hover:text-primary block px-4 py-2 transition-colors"
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="text-dark hover:bg-primary/10 hover:text-primary block px-4 py-2 transition-colors"
                      >
                        Einstellungen
                      </Link>
                      <hr className="my-2 border-gray-200" />
                      <button
                        onClick={handleLogout}
                        className="text-dark hover:bg-primary/10 hover:text-primary block w-full px-4 py-2 text-left transition-colors"
                      >
                        Abmelden
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="bg-primary hover:bg-primary-dark rounded-md px-4 py-2 text-white transition-colors"
                >
                  Login
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Menu Button - nur auf Mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-dark rounded-md p-2 hover:bg-gray-100 lg:hidden"
            aria-label="Menü öffnen"
          >
            <svg
              className="h-6 w-6"
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
          <div className="border-t border-gray-200 py-4 lg:hidden">
            <div className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <div key={link.href}>
                  {link.dropdown ? (
                    <>
                      <div className="flex items-center">
                        <Link
                          href={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex-1 rounded-md px-4 py-2 transition-colors ${
                            isActive(link.href, link.dropdown)
                              ? "text-primary bg-primary/10 font-semibold"
                              : "text-dark hover:text-primary hover:bg-gray-100"
                          }`}
                        >
                          {link.label}
                        </Link>
                        <button
                          onClick={() => toggleDropdown(link.label)}
                          className="text-dark rounded-md p-2 transition-colors hover:bg-gray-100"
                          aria-label={`${link.label} Untermenü öffnen`}
                        >
                          <svg
                            className={`h-5 w-5 transition-transform ${
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
                        <div className="mt-1 ml-4 space-y-1">
                          {link.dropdown.map((sublink) => (
                            <Link
                              key={sublink.href}
                              href={sublink.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`block rounded-md px-4 py-2 text-sm transition-colors ${
                                pathname === sublink.href
                                  ? "text-primary bg-primary/10 font-semibold"
                                  : "hover:text-primary text-gray-600 hover:bg-gray-100"
                              }`}
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
                      className={`block rounded-md px-4 py-2 transition-colors ${
                        isActive(link.href)
                          ? "text-primary bg-primary/10 font-semibold"
                          : "text-dark hover:text-primary hover:bg-gray-100"
                      }`}
                    >
                      {link.label}
                    </Link>
                  )}
                </div>
              ))}

              {/* Mobile Suche & Login/User Menu */}
              <div className="space-y-2 border-t border-gray-200 px-4 pt-4">
                <button className="text-dark flex w-full items-center rounded-md px-4 py-2 hover:bg-gray-100">
                  <svg
                    className="mr-2 h-5 w-5"
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

                {session?.user ? (
                  <>
                    <div className="flex items-center gap-2 px-4 py-2">
                      <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white">
                        {getInitials(session.user.name || session.user.email)}
                      </div>
                      <span className="text-dark text-sm font-medium">
                        Hi,{" "}
                        {(session.user as any).firstName ||
                          session.user.name?.split(" ")[0] ||
                          "User"}
                      </span>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-dark block w-full rounded-md px-4 py-2 text-left hover:bg-gray-100"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-dark block w-full rounded-md px-4 py-2 text-left hover:bg-gray-100"
                    >
                      Einstellungen
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="text-dark block w-full rounded-md px-4 py-2 text-left hover:bg-gray-100"
                    >
                      Abmelden
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="bg-primary hover:bg-primary-dark block w-full rounded-md px-4 py-2 text-center text-white transition-colors"
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
