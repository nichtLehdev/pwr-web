/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signOut, useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import ThemeToggle from "./theme-toggle";
import SearchModal from "./search-modal";
import { useBanner } from "../ui/banner-context";
import { useRouter } from "next/navigation";
import { useToast } from "../ui/toast";
import { ChevronDown, Search, Menu, X } from "lucide-react";
// Dashboard access is now controlled by permissions

export default function Navigation() {
  const pathname = usePathname();
  const { bannerHeight } = useBanner();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownTimeout, setDropdownTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const { data: session } = useSession();

  const { data: profile } = api.users.getMyProfile.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const { data: userPermissions } = api.permissions.getMyPermissions.useQuery(
    undefined,
    { enabled: !!session?.user?.id },
  );

  const hasDashboardAccess =
    Array.isArray(userPermissions) && userPermissions.length > 0;

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      document.body.classList.add("modal-open");
    } else {
      document.body.style.overflow = "";
      document.body.classList.remove("modal-open");
    }
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isActive = (href: string, dropdown?: Array<{ href: string }>) => {
    if (href === "/" && pathname === "/") return true;

    if (href !== "/" && pathname.startsWith(href)) return true;

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
        { href: "/materialien/blechblatt", label: "Rheinisches Blechblatt" },
        { href: "/materialien/literatur", label: "Literatur & CDs" },
      ],
    },
    {
      href: "/spiele",
      label: "Spiele",
      dropdown: [
        { href: "/spiele/rhythmus", label: "Rhythmus-Training" },
        { href: "/spiele/noten-lesen", label: "Noten lesen" },
        { href: "/spiele/griffe", label: "Griffe" },
        { href: "/spiele/notenwaage", label: "Notenwaage" },
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
    }, 300);
    setDropdownTimeout(timeout);
  };

  const handleLogout = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
          router.refresh();
        },
        onError: (error) => {
          toast.error(error.error.message);
        },
      },
    });
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
    <nav
      className="dark:bg-dark-surface dark:shadow-dark-border fixed right-0 left-0 z-50 w-full bg-white shadow-md transition-[top] duration-200"
      style={{ top: bannerHeight }}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between lg:h-20">
          <Link href="/" className="shrink-0">
            <div className="relative h-10 lg:h-14">
              <Image
                src={
                  isDarkMode
                    ? "/images/logo-horizontal-dark.svg"
                    : "/images/logo-horizontal.svg"
                }
                alt="Posaunenwerk Rheinland"
                width={200}
                height={56}
                className="pointer-events-none hidden h-full w-auto lg:block"
                priority
                unoptimized
              />
              <Image
                src={
                  isDarkMode
                    ? "/images/logo-icon-dark.svg"
                    : "/images/logo-icon.svg"
                }
                alt="Posaunenwerk Rheinland"
                width={40}
                height={40}
                className="pointer-events-none h-full w-auto lg:hidden"
                priority
                unoptimized
              />
            </div>
          </Link>

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
                          : "text-dark dark:text-dark-text hover:text-primary dark:hover:text-primary"
                      }`}
                    >
                      {link.label}
                      <ChevronDown className="h-4 w-4" />
                    </Link>
                    {openDropdown === link.label && (
                      <div
                        className="dark:border-dark-border dark:bg-dark-surface absolute top-full left-0 z-50 mt-2 w-64 rounded-lg border border-gray-100 bg-white py-2 shadow-xl dark:shadow-2xl"
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
                                : "text-dark dark:text-dark-text hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary"
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
                        : "text-dark dark:text-dark-text hover:text-primary dark:hover:text-primary"
                    }`}
                  >
                    {link.label}
                  </Link>
                )}
              </div>
            ))}

            <div className="ml-4 flex items-center space-x-4">
              <ThemeToggle />
              <button
                onClick={() => setSearchOpen(true)}
                className="text-dark dark:text-dark-text hover:text-primary dark:hover:text-primary flex items-center gap-2 transition-colors"
                aria-label="Suchen"
              >
                <Search className="h-5 w-5" />
                <kbd className="dark:border-dark-border hidden rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-400 xl:inline">
                  ⌘K
                </kbd>
              </button>

              {session?.user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="dark:hover:bg-dark-background-secondary flex items-center gap-2 rounded-md p-2 transition-colors hover:bg-gray-100"
                  >
                    <div className="bg-primary relative h-8 w-8 overflow-hidden rounded-full text-sm font-semibold text-white">
                      {profile?.profileImage?.url ? (
                        <Image
                          src={profile.profileImage.url}
                          alt={profile.profileImage.alt || "Profilbild"}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          {getInitials(session.user.name || session.user.email)}
                        </div>
                      )}
                    </div>

                    <ChevronDown
                      className={`text-dark dark:text-dark-text h-4 w-4 transition-transform ${
                        userMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {userMenuOpen && (
                    <div className="dark:border-dark-border dark:bg-dark-surface absolute top-full right-0 z-50 mt-2 w-48 rounded-lg border border-gray-100 bg-white py-2 shadow-xl dark:shadow-2xl">
                      {hasDashboardAccess && (
                        <Link
                          href="/dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="text-dark dark:text-dark-text hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary block px-4 py-2 transition-colors"
                        >
                          Dashboard
                        </Link>
                      )}
                      <Link
                        href="/registrations"
                        onClick={() => setUserMenuOpen(false)}
                        className="text-dark dark:text-dark-text hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary block px-4 py-2 transition-colors"
                      >
                        Meine Anmeldungen
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="text-dark dark:text-dark-text hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary block px-4 py-2 transition-colors"
                      >
                        Einstellungen
                      </Link>
                      <hr className="dark:border-dark-border my-2 border-gray-200" />
                      <button
                        onClick={handleLogout}
                        className="text-dark dark:text-dark-text hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary block w-full px-4 py-2 text-left transition-colors"
                      >
                        Abmelden
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="bg-primary hover:bg-primary-dark dark:bg-primary-light dark:hover:bg-primary rounded-md px-4 py-2 text-white transition-colors"
                >
                  Login
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Menu Button - nur auf Mobile */}
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-dark dark:text-dark-text dark:hover:bg-dark-background-secondary rounded-md p-2 hover:bg-gray-100"
              aria-label="Menü öffnen"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu - slide down */}
        {mobileMenuOpen && (
          <div
            className="dark:border-dark-border dark:bg-dark-surface fixed inset-x-0 bottom-0 overflow-y-auto border-t border-gray-200 bg-white py-4 lg:hidden"
            style={{ top: bannerHeight + 64 }}
          >
            <div className="flex flex-col space-y-1 px-4">
              {navLinks.map((link) => (
                <div key={link.href}>
                  {link.dropdown ? (
                    <>
                      <div className="flex items-center">
                        <Link
                          href={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex-1 rounded-md px-4 py-3 transition-colors ${
                            isActive(link.href, link.dropdown)
                              ? "text-primary bg-primary/10 font-semibold"
                              : "text-dark dark:text-dark-text hover:text-primary dark:hover:bg-dark-background-secondary hover:bg-gray-100"
                          }`}
                        >
                          {link.label}
                        </Link>
                        <button
                          onClick={() => toggleDropdown(link.label)}
                          className="text-dark dark:text-dark-text dark:hover:bg-dark-background-secondary rounded-md p-3 transition-colors hover:bg-gray-100"
                          aria-label={`${link.label} Untermenü öffnen`}
                        >
                          <ChevronDown
                            className={`h-5 w-5 transition-transform ${
                              openDropdown === link.label ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </div>
                      {openDropdown === link.label && (
                        <div className="mt-1 ml-4 space-y-1">
                          {link.dropdown.map((sublink) => (
                            <Link
                              key={sublink.href}
                              href={sublink.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`block rounded-md px-4 py-3 text-sm transition-colors ${
                                pathname === sublink.href
                                  ? "text-primary bg-primary/10 font-semibold"
                                  : "hover:text-primary dark:hover:bg-dark-background-secondary text-gray-600 hover:bg-gray-100 dark:text-gray-400"
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
                      className={`block rounded-md px-4 py-3 transition-colors ${
                        isActive(link.href)
                          ? "text-primary bg-primary/10 font-semibold"
                          : "text-dark dark:text-dark-text hover:text-primary dark:hover:bg-dark-background-secondary hover:bg-gray-100"
                      }`}
                    >
                      {link.label}
                    </Link>
                  )}
                </div>
              ))}

              {/* Mobile Suche & Login/User Menu */}
              <div className="dark:border-dark-border mt-4 space-y-2 border-t border-gray-200 pt-4">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setSearchOpen(true);
                  }}
                  className="text-dark dark:text-dark-text dark:hover:bg-dark-background-secondary flex w-full items-center rounded-md px-4 py-3 hover:bg-gray-100"
                >
                  <Search className="mr-2 h-5 w-5" />
                  Suchen
                </button>

                {session?.user ? (
                  <>
                    <div className="flex items-center gap-2 px-4 py-3">
                      <div className="bg-primary relative h-8 w-8 overflow-hidden rounded-full text-sm font-semibold text-white">
                        {profile?.profileImage?.url ? (
                          <Image
                            src={profile.profileImage.url}
                            alt={profile.profileImage.alt || "Profilbild"}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            {getInitials(
                              session.user.name || session.user.email,
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-dark dark:text-dark-text text-sm font-medium">
                        Hi,{" "}
                        {(session.user as any).firstName ||
                          session.user.name?.split(" ")[0] ||
                          "User"}
                      </span>
                    </div>
                    {hasDashboardAccess && (
                      <Link
                        href="/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-dark dark:text-dark-text dark:hover:bg-dark-background-secondary block w-full rounded-md px-4 py-3 text-left hover:bg-gray-100"
                      >
                        Dashboard
                      </Link>
                    )}
                    <Link
                      href="/registrations"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-dark dark:text-dark-text dark:hover:bg-dark-background-secondary block w-full rounded-md px-4 py-3 text-left hover:bg-gray-100"
                    >
                      Meine Anmeldungen
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-dark dark:text-dark-text dark:hover:bg-dark-background-secondary block w-full rounded-md px-4 py-3 text-left hover:bg-gray-100"
                    >
                      Einstellungen
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="text-dark dark:text-dark-text dark:hover:bg-dark-background-secondary block w-full rounded-md px-4 py-3 text-left hover:bg-gray-100"
                    >
                      Abmelden
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="bg-primary hover:bg-primary-dark dark:bg-primary-light dark:hover:bg-primary block w-full rounded-md px-4 py-3 text-center text-white transition-colors"
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </nav>
  );
}
