import { describe, expect, it } from "@jest/globals";
import { ensemblesFor, type ProgrammeEvent } from "../programme-data";

type Performer = ProgrammeEvent["performers"][number];

/** Nur die Felder, die `ensemblesFor` liest — der Rest der Zeile spielt hier keine Rolle. */
function performer(fields: Partial<Performer>): Performer {
  return {
    type: "CUSTOM",
    name: "",
    ensemble: null,
    auswahlChor: null,
    ...fields,
  } as Performer;
}

describe("ensemblesFor", () => {
  it("nennt den Auswahlchor und kennzeichnet ihn als solchen", () => {
    expect(
      ensemblesFor({
        performers: [
          performer({
            type: "AUSWAHLCHOR",
            name: "Alter Name",
            auswahlChor: { name: "Con Spirito" } as Performer["auswahlChor"],
          }),
        ],
      }),
    ).toEqual([{ name: "Con Spirito", auswahlchor: true }]);
  });

  it("stellt ein Ensemble dem Auswahlchor nach", () => {
    expect(
      ensemblesFor({
        performers: [
          performer({
            type: "ENSEMBLE",
            ensemble: {
              name: "Posaunenchor auf der Höhe",
            } as Performer["ensemble"],
          }),
        ],
      }),
    ).toEqual([{ name: "Posaunenchor auf der Höhe", auswahlchor: false }]);
  });

  it("übernimmt den Freitext einer eigenen Besetzung", () => {
    expect(
      ensemblesFor({
        performers: [performer({ name: "  Bezirkschor Essen-Mülheim  " })],
      }),
    ).toEqual([{ name: "Bezirkschor Essen-Mülheim", auswahlchor: false }]);
  });

  it("führt mehrere Mitwirkende in ihrer Reihenfolge", () => {
    expect(
      ensemblesFor({
        performers: [
          performer({
            type: "AUSWAHLCHOR",
            auswahlChor: { name: "Con Spirito" } as Performer["auswahlChor"],
          }),
          performer({ name: "Posaunenchor Mettmann" }),
        ],
      }),
    ).toEqual([
      { name: "Con Spirito", auswahlchor: true },
      { name: "Posaunenchor Mettmann", auswahlchor: false },
    ]);
  });

  // Das Ziel wurde gelöscht: der beim Speichern gemerkte Name bleibt stehen.
  it("fällt auf den gemerkten Namen zurück", () => {
    expect(
      ensemblesFor({
        performers: [performer({ type: "ENSEMBLE", name: "Posaunenchor Alt" })],
      }),
    ).toEqual([{ name: "Posaunenchor Alt", auswahlchor: false }]);
  });

  it("bleibt ohne Mitwirkende leer", () => {
    expect(ensemblesFor({ performers: [] })).toEqual([]);
    expect(ensemblesFor({ performers: [performer({ name: "  " })] })).toEqual(
      [],
    );
  });
});
