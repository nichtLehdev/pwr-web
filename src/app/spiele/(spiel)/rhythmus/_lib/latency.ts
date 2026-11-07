const STORAGE_KEY = "pwr.spiele.v1.rhythmus.latency";

const MIN_SAMPLES = 5;
const DISCARD_FIRST = 2;
const MAX_SPREAD_MS = 70;

export type LatencyEstimate =
  | { ok: true; latencyMs: number }
  | { ok: false; reason: "too-few" | "scattered" };

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/**
 * Median-Abstand der Tipps zum nächsten Klick. Die ersten Tipps zählen nicht: Da findet man
 * den Puls erst noch. Weit Streuendes wird abgelehnt, statt einen Unsinnswert zu speichern.
 */
export function estimateLatency(
  tapSec: readonly number[],
  clickSec: readonly number[],
): LatencyEstimate {
  const deltas = tapSec.slice(DISCARD_FIRST).map((tap) => {
    let best = Infinity;
    for (const click of clickSec) {
      if (Math.abs(tap - click) < Math.abs(best)) best = tap - click;
    }
    return best * 1000;
  });
  if (deltas.length < MIN_SAMPLES) return { ok: false, reason: "too-few" };
  const center = median(deltas);
  const spread = median(deltas.map((d) => Math.abs(d - center)));
  if (spread > MAX_SPREAD_MS) return { ok: false, reason: "scattered" };
  return { ok: true, latencyMs: Math.round(center) };
}

export function loadLatencyMs(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveLatencyMs(value: number | null): void {
  try {
    if (value === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    /* Privatmodus: dann gilt der vom Browser gemeldete Wert. */
  }
}
