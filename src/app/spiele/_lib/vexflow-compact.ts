import VexFlow, { Metrics, MetricsDefaults } from "vexflow/bravura";

let fontsReady: Promise<void> | null = null;

/** Bravura/Academico einmalig laden — alle Renderer teilen sich das Promise. */
export function ensureVexFlowFonts(): Promise<void> {
  if (!fontsReady) fontsReady = VexFlow.loadFonts("Bravura", "Academico");
  return fontsReady;
}

export type CompactMetrics = {
  fontScale: number;
  stavePadding: number;
  staveEndPaddingMax: number;
  staveEndPaddingMin: number;
  noteHeadMinPadding: number;
};

/**
 * Führt `fn` mit global verkleinerten VexFlow-Metriken aus und stellt danach
 * den Ausgangszustand wieder her — `MetricsDefaults` ist globaler Zustand,
 * andere Renderer dürfen die Kompakt-Werte nicht erben.
 */
export function withCompactMetrics<T>(
  compact: CompactMetrics | null,
  fn: () => T,
): T {
  if (!compact) return fn();

  const prev = {
    fontScale: MetricsDefaults.fontScale as number,
    stavePadding: MetricsDefaults.Stave.padding as number,
    staveEndMax: MetricsDefaults.Stave.endPaddingMax as number,
    staveEndMin: MetricsDefaults.Stave.endPaddingMin as number,
    noteHeadMin: MetricsDefaults.NoteHead.minPadding as number,
  };

  MetricsDefaults.fontScale = compact.fontScale;
  MetricsDefaults.Stave.padding = compact.stavePadding;
  MetricsDefaults.Stave.endPaddingMax = compact.staveEndPaddingMax;
  MetricsDefaults.Stave.endPaddingMin = compact.staveEndPaddingMin;
  MetricsDefaults.NoteHead.minPadding = compact.noteHeadMinPadding;

  try {
    return fn();
  } finally {
    MetricsDefaults.fontScale = prev.fontScale;
    MetricsDefaults.Stave.padding = prev.stavePadding;
    MetricsDefaults.Stave.endPaddingMax = prev.staveEndMax;
    MetricsDefaults.Stave.endPaddingMin = prev.staveEndMin;
    MetricsDefaults.NoteHead.minPadding = prev.noteHeadMin;
    Metrics.clear();
  }
}
