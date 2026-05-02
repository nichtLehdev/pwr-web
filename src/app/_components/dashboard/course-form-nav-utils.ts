"use client";

export function scrollToCourseFormSection(href: string) {
  document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" });
  try {
    history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}${href}`,
    );
  } catch {
    /* ignore */
  }
}
