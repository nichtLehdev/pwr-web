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
 * Festwerte statt Tokens: E-Mail-Programme kennen keine CSS-Variablen, keine
 * eingebundenen Schriften und kein Flex-/Rasterlayout.
 */
export const farben = {
  ink: "#1c1d1f",
  paper: "#ffffff",
  /** Darauf steht immer Tinte, nie Papier (Weiß auf Orange: 1,99:1). */
  primary: "#faa619",
  /** Orange auf hellem Grund ist zu schwach für Text. */
  primaryInk: "#a55800",
  rule: "#d4d4d1",
  /** Schiefer — Meta-Angaben und Fußzeile. */
  muted: "#58595b",
} as const;

/** Archivo kommt im Postfach nicht an; systemnahe Kette statt Notschrift. */
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

export const abschnittskopf = {
  fontFamily: schrift,
  fontSize: "22px",
  lineHeight: "28px",
  fontWeight: "bold" as const,
  color: farben.ink,
  margin: "0 0 12px 0",
};

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

export const haarlinie = {
  borderTop: `1px solid ${farben.rule}`,
  margin: "28px 0",
};

export const tintenstrich = {
  borderTop: `2px solid ${farben.ink}`,
  margin: "28px 0 0 0",
};

/**
 * Trennlinie als gefüllte Tabellenzelle: Outlook für Windows (Word-Engine) lässt
 * Rahmen an `<hr>`, `<div>` und `<table>` fallen; Rahmen an `<td>` sind sicher.
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
 * Bildmarke in Tinte-Fassung (grau/hell verschwimmt auf Orange). Blockiert das
 * Programm Bilder, bleibt der Schriftzug als Text sichtbar.
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

// Kein borderTop hier: Die Striche zeichnet `Regel`, sonst fehlen sie in Outlook.
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
