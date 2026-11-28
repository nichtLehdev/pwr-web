/** Kleine Notenwolke beim Treffer; nur in der Markenfarbe. */
export function spawnBurst(
  container: HTMLElement,
  x: number,
  y: number,
  count: number,
): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const pieces = count * 2;
  for (let i = 0; i < pieces; i++) {
    const piece = document.createElement("span");
    const angle = (Math.PI * 2 * i) / pieces + Math.random() * 0.6;
    const distance = 22 + Math.random() * 18;
    piece.className = "spiel-burst";
    piece.textContent = "♪";
    piece.classList.add("text-primary-ink", "dark:text-primary");
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
    piece.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    piece.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    piece.addEventListener("animationend", () => piece.remove());
    container.appendChild(piece);
  }
}
