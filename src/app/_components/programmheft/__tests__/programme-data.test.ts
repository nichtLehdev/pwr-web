import { describe, expect, it } from "@jest/globals";
import { ensembleFor, type ProgrammeEvent } from "../programme-data";

/** Nur die Felder, die `ensembleFor` liest — der Rest der Zeile spielt hier keine Rolle. */
function event(fields: Partial<ProgrammeEvent>): ProgrammeEvent {
  return {
    performingEnsembleType: null,
    performingEnsembleName: null,
    auswahlChor: null,
    ensemble: null,
    ...fields,
  } as ProgrammeEvent;
}

describe("ensembleFor", () => {
  it("nennt den Auswahlchor und kennzeichnet ihn als solchen", () => {
    expect(
      ensembleFor(
        event({
          performingEnsembleType: "AUSWAHLCHOR",
          auswahlChor: { name: "Con Spirito" } as ProgrammeEvent["auswahlChor"],
        }),
      ),
    ).toEqual({ name: "Con Spirito", auswahlchor: true });
  });

  it("stellt ein Ensemble dem Auswahlchor nach", () => {
    expect(
      ensembleFor(
        event({
          performingEnsembleType: "ENSEMBLE",
          ensemble: {
            name: "Posaunenchor auf der Höhe",
          } as ProgrammeEvent["ensemble"],
        }),
      ),
    ).toEqual({ name: "Posaunenchor auf der Höhe", auswahlchor: false });
  });

  it("übernimmt den Freitext einer eigenen Besetzung", () => {
    expect(
      ensembleFor(
        event({
          performingEnsembleType: "CUSTOM",
          performingEnsembleName: "  Bezirkschor Essen-Mülheim  ",
        }),
      ),
    ).toEqual({ name: "Bezirkschor Essen-Mülheim", auswahlchor: false });
  });

  it("bleibt ohne Ensemble leer", () => {
    expect(ensembleFor(event({}))).toBeNull();
  });

  // Die Art ist gesetzt, der Verweis fehlt: kein leeres Etikett drucken.
  it("bleibt leer, wenn die gesetzte Art auf nichts zeigt", () => {
    expect(
      ensembleFor(event({ performingEnsembleType: "AUSWAHLCHOR" })),
    ).toBeNull();
    expect(
      ensembleFor(event({ performingEnsembleType: "ENSEMBLE" })),
    ).toBeNull();
    expect(
      ensembleFor(
        event({
          performingEnsembleType: "CUSTOM",
          performingEnsembleName: "  ",
        }),
      ),
    ).toBeNull();
  });
});
