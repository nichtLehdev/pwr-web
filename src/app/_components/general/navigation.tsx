/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signOut, useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import ThemeToggle from "./theme-toggle";
import NotificationBell from "./notification-bell";
import SearchModal from "./search-modal";
import { useBanner } from "../ui/banner-context";
import { useRouter } from "next/navigation";
import { useToast } from "../ui/toast";
import { ChevronDown, Search, Menu, X } from "lucide-react";
// Dashboard access is now controlled by permissions

/** Programmheft-Bausteine der Navigation. */
const ICON_BUTTON =
  "text-ink hover:bg-ink hover:text-paper dark:text-night-text dark:hover:bg-night-text dark:hover:text-night inline-flex h-11 w-11 items-center justify-center transition-colors";
const PANEL =
  "border-ink bg-paper dark:border-night-rule dark:bg-night-raised absolute top-full z-50 mt-2 border-2 py-1";
const PANEL_ITEM =
  "text-ink hover:bg-primary dark:text-night-text dark:hover:bg-primary dark:hover:text-ink flex w-full items-center gap-3 px-4 py-3 text-left text-base font-medium transition-colors";

function CurrentMarker({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={`h-2 w-2 shrink-0 ${
        active ? "bg-ink dark:bg-primary" : "bg-transparent"
      }`}
    />
  );
}

const topLinkClass = (active: boolean) =>
  `semi-condensed inline-flex h-11 items-center gap-1 border-b-[3px] px-0.5 text-[1.0625rem] font-semibold transition-colors ${
    active
      ? "border-primary text-ink dark:text-night-text"
      : "text-dark hover:border-ink hover:text-ink dark:text-night-muted dark:hover:border-night-text dark:hover:text-night-text border-transparent"
  }`;

const mobileRowClass = (active: boolean) =>
  `semi-condensed flex flex-1 items-center gap-3 px-5 py-4 text-xl transition-colors hover:bg-primary hover:text-ink dark:hover:text-ink ${
    active
      ? "text-ink dark:text-night-text font-bold"
      : "text-ink dark:text-night-text font-semibold"
  }`;

export default function Navigation() {
  const pathname = usePathname();
  const { bannerHeight } = useBanner();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownTimeout, setDropdownTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const { data: session } = useSession();

  const { data: profile } = api.users.getMyProfile.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const { hasDashboardAccess } = usePermissions();

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

  // Close the user menu on any click outside it (same pattern as
  // NotificationBell) — the nav dropdowns close on hover-out instead.
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [userMenuOpen]);

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
        {
          href: "/mitmachen/mitgliedschaft",
          label: "Mitgliedschaft & Versicherung",
        },
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
    { href: "/spiele", label: "Spiele" },
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
        { href: "/praevention", label: "Prävention" },
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
      className="programm font-programm bg-paper dark:bg-night fixed right-0 left-0 z-50 w-full shadow-[inset_0_-2px_0_var(--color-ink)] transition-[top] duration-200 dark:shadow-[inset_0_-2px_0_var(--color-night-rule)]"
      style={{
        top: bannerHeight,
        // Ohne Banner ist die Nav das oberste Element — sie reserviert die Notch-Fläche.
        paddingTop:
          bannerHeight === 0 ? "env(safe-area-inset-top, 0px)" : undefined,
      }}
    >
      <div className="sheet">
        <div className="flex h-16 items-center justify-between lg:h-20">
          <Link
            href="/"
            className="-ml-2 inline-flex h-12 min-w-12 shrink-0 items-center justify-center px-2 lg:h-16"
          >
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

          <div className="hidden items-center gap-5 text-nowrap lg:flex xl:gap-7">
            {navLinks.map((link) => (
              <div
                key={link.href}
                className="relative"
                onMouseEnter={() =>
                  link.dropdown && handleMouseEnter(link.label)
                }
                onMouseLeave={() => link.dropdown && handleMouseLeave()}
                onFocus={() => link.dropdown && handleMouseEnter(link.label)}
                onBlur={() => link.dropdown && handleMouseLeave()}
              >
                {link.dropdown ? (
                  <>
                    <Link
                      href={link.href}
                      className={topLinkClass(
                        isActive(link.href, link.dropdown),
                      )}
                      aria-expanded={openDropdown === link.label}
                    >
                      {link.label}
                      <ChevronDown className="h-4 w-4" aria-hidden />
                    </Link>
                    {openDropdown === link.label && (
                      <div
                        className={`${PANEL} left-0 w-72`}
                        onMouseEnter={() =>
                          link.dropdown && handleMouseEnter(link.label)
                        }
                        onMouseLeave={() => link.dropdown && handleMouseLeave()}
                      >
                        {link.dropdown.map((sublink) => (
                          <Link
                            key={sublink.href}
                            href={sublink.href}
                            aria-current={
                              pathname === sublink.href ? "page" : undefined
                            }
                            className={`${PANEL_ITEM} ${
                              pathname === sublink.href ? "font-semibold" : ""
                            }`}
                          >
                            <CurrentMarker active={pathname === sublink.href} />
                            {sublink.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={link.href}
                    aria-current={pathname === link.href ? "page" : undefined}
                    className={topLinkClass(isActive(link.href))}
                  >
                    {link.label}
                  </Link>
                )}
              </div>
            ))}

            <div className="ml-2 flex items-center gap-1">
              <ThemeToggle />
              <button
                onClick={() => setSearchOpen(true)}
                className={ICON_BUTTON}
                aria-label="Suchen"
              >
                <Search className="h-5 w-5" aria-hidden />
              </button>

              {session?.user && <NotificationBell />}

              {session?.user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="hover:bg-ink/5 dark:hover:bg-night-raised flex h-11 items-center gap-2 px-1.5 transition-colors"
                    aria-label="Benutzermenü"
                    aria-expanded={userMenuOpen}
                  >
                    <div className="bg-primary text-ink relative h-8 w-8 overflow-hidden rounded-full text-sm font-semibold">
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
                      aria-hidden
                      className={`text-ink dark:text-night-text h-4 w-4 transition-transform ${
                        userMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {userMenuOpen && (
                    <div className={`${PANEL} right-0 w-56`}>
                      {hasDashboardAccess && (
                        <Link
                          href="/dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className={PANEL_ITEM}
                        >
                          Dashboard
                        </Link>
                      )}
                      <Link
                        href="/registrations"
                        onClick={() => setUserMenuOpen(false)}
                        className={PANEL_ITEM}
                      >
                        Meine Anmeldungen
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className={PANEL_ITEM}
                      >
                        Einstellungen
                      </Link>
                      <hr className="border-rule dark:border-night-rule my-1" />
                      <button onClick={handleLogout} className={PANEL_ITEM}>
                        Abmelden
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="semi-condensed bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper ml-2 inline-flex h-11 items-center px-5 text-base font-semibold transition-colors"
                >
                  Login
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Menu Button - nur auf Mobile */}
          <div className="-mr-2 flex items-center lg:hidden">
            <ThemeToggle />
            {session?.user && <NotificationBell />}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={ICON_BUTTON}
              aria-label={mobileMenuOpen ? "Menü schließen" : "Menü öffnen"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden />
              ) : (
                <Menu className="h-6 w-6" aria-hidden />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu - slide down */}
      {mobileMenuOpen && (
        <div
          className="bg-paper dark:bg-night fixed inset-x-0 bottom-0 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom,0px))] shadow-[inset_0_2px_0_var(--color-ink)] lg:hidden dark:shadow-[inset_0_2px_0_var(--color-night-rule)]"
          style={{
            top:
              bannerHeight === 0
                ? "calc(64px + env(safe-area-inset-top, 0px))"
                : bannerHeight + 64,
          }}
        >
          <ul className="pt-0.5">
            {navLinks.map((link) => (
              <li
                key={link.href}
                className="border-rule dark:border-night-rule border-b"
              >
                {link.dropdown ? (
                  <>
                    <div className="flex items-stretch">
                      <Link
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={mobileRowClass(
                          isActive(link.href, link.dropdown),
                        )}
                      >
                        <CurrentMarker
                          active={isActive(link.href, link.dropdown)}
                        />
                        {link.label}
                      </Link>
                      <button
                        onClick={() => toggleDropdown(link.label)}
                        className="text-ink hover:bg-primary dark:text-night-text dark:hover:text-ink border-rule dark:border-night-rule flex w-16 items-center justify-center border-l transition-colors"
                        aria-label={`${link.label} Untermenü öffnen`}
                        aria-expanded={openDropdown === link.label}
                      >
                        <ChevronDown
                          aria-hidden
                          className={`h-5 w-5 transition-transform ${
                            openDropdown === link.label ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </div>
                    {openDropdown === link.label && (
                      <ul className="border-rule dark:border-night-rule border-t pb-2">
                        {link.dropdown.map((sublink) => (
                          <li key={sublink.href}>
                            <Link
                              href={sublink.href}
                              onClick={() => setMobileMenuOpen(false)}
                              aria-current={
                                pathname === sublink.href ? "page" : undefined
                              }
                              className={`hover:bg-primary hover:text-ink dark:hover:text-ink flex items-center gap-3 py-3 pr-5 pl-10 text-lg transition-colors ${
                                pathname === sublink.href
                                  ? "text-ink dark:text-night-text font-semibold"
                                  : "text-dark dark:text-night-muted font-medium"
                              }`}
                            >
                              <CurrentMarker
                                active={pathname === sublink.href}
                              />
                              {sublink.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={pathname === link.href ? "page" : undefined}
                    className={mobileRowClass(isActive(link.href))}
                  >
                    <CurrentMarker active={isActive(link.href)} />
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          {/* Mobile Suche & Login/User Menu */}
          <div className="border-ink dark:border-night-text mt-6 border-t-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setSearchOpen(true);
              }}
              className="border-rule text-ink hover:bg-primary dark:border-night-rule dark:text-night-text dark:hover:text-ink flex w-full items-center gap-3 border-b px-5 py-4 text-lg font-medium transition-colors"
            >
              <Search className="h-5 w-5" aria-hidden />
              Suchen
            </button>

            {session?.user ? (
              <>
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="bg-primary text-ink relative h-8 w-8 overflow-hidden rounded-full text-sm font-semibold">
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
                  <span className="text-ink dark:text-night-text text-base font-medium">
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
                    className="border-rule text-ink hover:bg-primary dark:border-night-rule dark:text-night-text dark:hover:text-ink block border-t px-5 py-4 text-lg font-medium transition-colors"
                  >
                    Dashboard
                  </Link>
                )}
                <Link
                  href="/registrations"
                  onClick={() => setMobileMenuOpen(false)}
                  className="border-rule text-ink hover:bg-primary dark:border-night-rule dark:text-night-text dark:hover:text-ink block border-t px-5 py-4 text-lg font-medium transition-colors"
                >
                  Meine Anmeldungen
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="border-rule text-ink hover:bg-primary dark:border-night-rule dark:text-night-text dark:hover:text-ink block border-t px-5 py-4 text-lg font-medium transition-colors"
                >
                  Einstellungen
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="border-rule text-ink hover:bg-primary dark:border-night-rule dark:text-night-text dark:hover:text-ink block w-full border-t px-5 py-4 text-left text-lg font-medium transition-colors"
                >
                  Abmelden
                </button>
              </>
            ) : (
              <div className="px-5 pt-5">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="semi-condensed bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink flex h-14 w-full items-center justify-center text-xl font-semibold transition-colors"
                >
                  Login
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </nav>
  );
}
