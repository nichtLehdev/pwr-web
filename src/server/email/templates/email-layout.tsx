import {
  Body,
  Column,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

/**
 * Gemeinsame Hülle aller E-Mails im Programmheft.
 *
 * Warum hier vieles anders aussieht als auf der Website: E-Mail-Programme
 * verwerfen eingebundene Schriften, kennen kein Flex- oder Rasterlayout und
 * keine CSS-Variablen. Die schmale Archivo — das prägendste Merkmal des Hefts
 * — lässt sich deshalb nicht übertragen. Was trägt, sind die übrigen Mittel:
 * volle Druckfläche in Orange mit Tinte darauf, Haarlinien, Tabellensatz und
 * ruhige Zeilenlänge.
 *
 * Farben stehen als Festwerte, weil die Tokens aus globals.css im Postfach
 * nicht existieren.
 */
export const farben = {
  /** Tinte — Fließtext und Flächen. */
  ink: "#1c1d1f",
  paper: "#ffffff",
  /** Druckorange. Darauf steht immer Tinte, nie Papier (Weiß auf Orange: 1,99:1). */
  primary: "#faa619",
  /** Messing-Tinte: Orange auf hellem Grund ist zu schwach für Text. 5,26:1. */
  primaryInk: "#a55800",
  /** Haarlinie. */
  rule: "#d4d4d1",
  /** Schiefer — Meta-Angaben und Fußzeile. */
  muted: "#58595b",
} as const;

/**
 * Archivo kommt im Postfach nicht an. Die Ersatzkette bleibt bewusst
 * systemnah, damit überall dieselbe Zeile steht statt einer Notschrift.
 */
export const schrift =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

/** Absolute Adresse für Bilder und Links — relative Pfade tragen in E-Mail nicht. */
export function emailBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "https://posaunenwerk-rheinland.de"
  );
}

export const grundtext = {
  fontFamily: schrift,
  fontSize: "16px",
  lineHeight: "26px",
  color: farben.ink,
  margin: "0 0 16px 0",
};

export const kleintext = {
  ...grundtext,
  fontSize: "14px",
  lineHeight: "22px",
  color: farben.muted,
};

/** Abschnittskopf: fett, Tinte, mit 2px-Strich darunter wie im Heft. */
export const abschnittskopf = {
  fontFamily: schrift,
  fontSize: "22px",
  lineHeight: "28px",
  fontWeight: "bold" as const,
  color: farben.ink,
  margin: "0 0 12px 0",
};

/**
 * Hauptschaltfläche: Tinte gefüllt, Papierschrift, eckig. Wie auf der
 * Website — und anders als bisher, wo sie orange mit weißer Schrift war.
 */
export const knopf = {
  backgroundColor: farben.ink,
  color: farben.paper,
  fontFamily: schrift,
  fontSize: "16px",
  fontWeight: "bold" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 28px",
};

/** Textlink: Messing-Tinte, immer unterstrichen. */
export const link = {
  color: farben.primaryInk,
  textDecoration: "underline",
  fontWeight: "bold" as const,
};

/** Ersatzadresse unter einem Knopf — umbrechend, damit nichts überläuft. */
export const ersatzLink = {
  ...kleintext,
  fontSize: "12px",
  lineHeight: "20px",
  color: farben.primaryInk,
  wordBreak: "break-all" as const,
};

/** Haarlinie zwischen Abschnitten. */
export const haarlinie = {
  borderTop: `1px solid ${farben.rule}`,
  margin: "28px 0",
};

/** 2px-Tintenstrich — trennt stärker, etwa über einer Werttabelle. */
export const tintenstrich = {
  borderTop: `2px solid ${farben.ink}`,
  margin: "28px 0 0 0",
};

/**
 * Trennlinie als gefüllte Tabellenzelle statt als Rahmen.
 *
 * Outlook für Windows rendert mit der Word-Engine und lässt Rahmen an `<hr>`,
 * `<div>` und `<table>` je nach Fassung fallen — die Linie verschwindet dann
 * ersatzlos. Eine Zelle mit Hintergrundfarbe und fester Höhe zeichnet sie
 * dort zuverlässig. Rahmen an `<td>` (etwa in den Werttabellen) sind davon
 * nicht betroffen und bleiben, wo sie stehen.
 *
 * `stark`: 2px in Tinte, wie der Abschnittsstrich im Heft. Sonst Haarlinie.
 */
export function Regel({
  stark = false,
  abstand = "28px 0",
}: {
  stark?: boolean;
  abstand?: string;
}) {
  return (
    <Section style={{ margin: abstand }}>
      <Row>
        <Column
          style={{
            height: stark ? "2px" : "1px",
            lineHeight: "1px",
            fontSize: "1px",
            backgroundColor: stark ? farben.ink : farben.rule,
          }}
        >
          &nbsp;
        </Column>
      </Row>
    </Section>
  );
}

interface EmailLayoutProps {
  /** Zeile in der Vorschau des Postfachs. */
  preview?: string;
  children: ReactNode;
}

/**
 * Kopf mit Bildmarke und Schriftzug auf oranger Druckfläche, darunter der
 * Inhalt auf Papier und eine Fußzeile hinter einer Haarlinie.
 *
 * Die Bildmarke liegt als Tinte-Fassung vor: Die ausgelieferte graue Marke
 * verschwimmt auf Orange, die helle wäscht aus. Wird das Bild vom Programm
 * blockiert — was viele standardmäßig tun — bleibt der Schriftzug als Text
 * darunter sichtbar, die Mail verliert also nichts.
 */
export function EmailLayout({ preview, children }: EmailLayoutProps) {
  const basis = emailBaseUrl();

  return (
    <Html lang="de">
      <Head />
      {preview ? <Preview>{preview}</Preview> : null}
      <Body style={koerper}>
        <Container style={behaelter}>
          <Section style={kopf}>
            <Img
              src={`${basis}/images/logo-icon-ink.png`}
              width="24"
              height="59"
              alt=""
              style={{ display: "block", margin: "0 auto 12px auto" }}
            />
            <Text style={wortmarke}>Posaunenwerk Rheinland</Text>
            <Text style={unterzeile}>
              Posaunenwerk der Evangelischen Kirche im Rheinland
            </Text>
          </Section>

          <Regel stark abstand="0" />

          <Section style={inhalt}>{children}</Section>

          <Regel abstand="0" />

          <Section style={fuss}>
            <Text style={fusstext}>
              Posaunenwerk der Evangelischen Kirche im Rheinland e.V.
            </Text>
            <Text style={fusstext}>
              Rudolf-Harbig-Str. 20 · 56179 Vallendar
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const koerper = {
  backgroundColor: farben.paper,
  fontFamily: schrift,
  margin: "0",
  padding: "0",
};

/** Kein Schatten, keine Rundung — das Blatt steht für sich. */
const behaelter = {
  backgroundColor: farben.paper,
  margin: "0 auto",
  padding: "0",
  maxWidth: "600px",
  width: "100%",
};

const kopf = {
  backgroundColor: farben.primary,
  padding: "28px 24px",
  textAlign: "center" as const,
};

const wortmarke = {
  fontFamily: schrift,
  color: farben.ink,
  fontSize: "24px",
  lineHeight: "28px",
  fontWeight: "bold" as const,
  margin: "0 0 4px 0",
};

const unterzeile = {
  fontFamily: schrift,
  color: farben.ink,
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0",
};

// Die Striche über Inhalt und Fußzeile zeichnet `Regel` als Tabellenzelle —
// ein borderTop an diesen Abschnitten würde in Outlook fehlen.
const inhalt = {
  padding: "32px 24px 8px 24px",
};

const fuss = {
  padding: "20px 24px 32px 24px",
};

const fusstext = {
  fontFamily: schrift,
  fontSize: "12px",
  lineHeight: "18px",
  color: farben.muted,
  margin: "0",
  textAlign: "center" as const,
};
