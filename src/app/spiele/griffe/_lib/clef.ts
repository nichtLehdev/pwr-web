import { clefForInstrument } from "../../noten-lesen/_lib/ranges";
import type { ClefKind } from "../../noten-lesen/_lib/types";
import type { GriffeInstrumentId } from "./types";
import { griffeToNotenInstrumentId } from "./pitch-range";

export function griffeClef(inst: GriffeInstrumentId): ClefKind {
  return clefForInstrument(griffeToNotenInstrumentId(inst));
}
