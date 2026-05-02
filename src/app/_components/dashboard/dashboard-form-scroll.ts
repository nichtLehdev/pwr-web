/**
 * Smooth-scroll to `href` anchors (e.g. `#section-id`) used by dashboard sectioned forms.
 */
export function scrollToDashboardSection(href: string) {
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
