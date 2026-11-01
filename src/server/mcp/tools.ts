import type { z } from "zod";

import { MCP_SCOPES, type McpScope } from "@/lib/mcp-scopes";
import { restrictEnsembleInput } from "./ensemble-input";
import { summarizeProfile } from "./profile-summary";

/**
 * Werkzeuge des MCP-Servers. Jedes ruft genau eine bestehende tRPC-Prozedur
 * auf – mit deren Eingabeschema und deren Rechteprüfung. Neue Werkzeuge also
 * hier eintragen, nicht nachbauen.
 *
 * Nie aufnehmen: Prozeduren für Anmeldungen, Teilnehmende, Rechnungen oder
 * Kursmails (`registrations.*`, `invoices.*`, `courseMail.*`,
 * `savedParticipants.*`, `courses.getRegistrations`). Deren Daten dürfen nicht
 * an KI-Clients gehen; `personal-data.ts` filtert sie zusätzlich heraus.
 */
export interface McpToolDefinition {
  name: string;
  title: string;
  description: string;
  /** Pfad der tRPC-Prozedur, z. B. `posts.create`. */
  procedure: string;
  /** Welchen OAuth-Umfang der Client braucht. */
  scope: McpScope;
  /** Löscht oder verwirft etwas unwiderruflich. */
  destructive?: boolean;
  /** Kürzt das Ergebnis, bevor es an den Client geht (z. B. ohne Privatdaten). */
  mapResult?: (result: unknown) => unknown;
  /**
   * Strengere Eingabe als die der Prozedur, wenn das Formular mehr vorgibt
   * als die Prozedur prüft. Gilt für das angezeigte Schema und die Prüfung.
   */
  restrictInput?: (input: z.ZodObject) => z.ZodObject;
}

const READ = MCP_SCOPES.READ;
const WRITE = MCP_SCOPES.WRITE;

const STATUS_NOTE =
  "Status: DRAFT (Entwurf), PENDING (zur Freigabe einreichen, Standard), APPROVED (sofort veröffentlichen – nur mit Freigaberecht). Wer kein Freigaberecht hat, reicht mit PENDING ein.";

const MARKDOWN_NOTE =
  "Texte (content/description) sind Markdown; Überschriften ab ##, Absätze mit Leerzeile.";

const DATE_NOTE =
  "Zeitangaben als ISO 8601 mit Zeitzone, z. B. 2026-11-14T19:30:00+01:00 (deutsche Zeit: +01:00 im Winter, +02:00 im Sommer).";

const REHEARSAL_NOTE =
  "Probenzeiten über rehearsalSchedules: je Eintrag ein Wochentag (Montag … Sonntag) und nur der Probenbeginn als HH:MM, z. B. 19:30 – keine Spanne wie „19:30 - 21:30“, kein „Uhr“. Probiert ein Chor an mehreren Tagen, ein Eintrag pro Tag.";

export const MCP_TOOLS: McpToolDefinition[] = [
  // ── Kontext ────────────────────────────────────────────────────────────
  {
    name: "get_my_profile",
    title: "Eigenes Profil",
    description:
      "Wer angemeldet ist: Name, Bezirk(e) und Ämter. Gut als erster Schritt, um zu wissen, in wessen Namen gearbeitet wird.",
    procedure: "users.getMyProfile",
    mapResult: summarizeProfile,
    scope: READ,
  },
  {
    name: "get_my_permissions",
    title: "Eigene Rechte",
    description:
      "Liste der Rechte der angemeldeten Person (z. B. posts.create, events.approve). Zeigt, welche Werkzeuge sinnvoll nutzbar sind; was fehlt, lehnt der Server ab.",
    procedure: "permissions.getMyPermissions",
    scope: READ,
  },
  {
    name: "list_bezirke",
    title: "Bezirke",
    description:
      "Alle Bezirke mit ID, Nummer und Name. Die ID braucht man für bezirkId bei Beiträgen, Terminen, Kursen und Ensembles.",
    procedure: "bezirke.getAll",
    scope: READ,
  },
  {
    name: "list_locations",
    title: "Orte",
    description:
      "Veranstaltungsorte (Kirchen, Gemeindehäuser) mit ID und Adresse; Suche über search/city. Die ID braucht man für locationId.",
    procedure: "locations.getAll",
    scope: READ,
  },
  {
    name: "create_location",
    title: "Ort anlegen",
    description:
      "Neuen Veranstaltungsort anlegen. Vorher mit list_locations prüfen, ob es ihn schon gibt.",
    procedure: "locations.create",
    scope: WRITE,
  },
  {
    name: "update_location",
    title: "Ort ändern",
    description: "Veranstaltungsort ändern. Nur übergebene Felder ändern sich.",
    procedure: "locations.update",
    scope: WRITE,
  },
  {
    name: "list_media",
    title: "Mediathek",
    description:
      "Bilder und Dateien der Mediathek, die die Person sehen darf. Die ID braucht man z. B. für coverImageId oder imageId. Hochladen geht nur über die Webseite.",
    procedure: "media.getAll",
    scope: READ,
  },
  {
    name: "list_auswahlchoere",
    title: "Auswahlchöre",
    description: "Auswahlchöre mit ID (für auswahlChorId bei Terminen).",
    procedure: "auswahlchoere.getAll",
    scope: READ,
  },

  // ── Beiträge (Aktuelles) ───────────────────────────────────────────────
  {
    name: "list_posts",
    title: "Beiträge auflisten",
    description:
      "Beiträge (Aktuelles), die die Person bearbeiten darf, inklusive Entwürfen. Filter nach Status, Kategorie, Bezirk und Freitext.",
    procedure: "posts.getDashboardPosts",
    scope: READ,
  },
  {
    name: "get_post",
    title: "Beitrag lesen",
    description: "Einen Beitrag vollständig lesen (per ID oder Slug).",
    procedure: "posts.getById",
    scope: READ,
  },
  {
    name: "create_post",
    title: "Beitrag anlegen",
    description: `Neuen Beitrag für Aktuelles anlegen. Kategorien: MAGAZIN, EVENT, AUSBILDUNG, BEZIRKE, ANDERE. ${MARKDOWN_NOTE} ${STATUS_NOTE}`,
    procedure: "posts.create",
    scope: WRITE,
  },
  {
    name: "update_post",
    title: "Beitrag ändern",
    description: `Beitrag ändern; nur übergebene Felder ändern sich. ${MARKDOWN_NOTE} ${STATUS_NOTE}`,
    procedure: "posts.update",
    scope: WRITE,
  },
  {
    name: "duplicate_post",
    title: "Beitrag duplizieren",
    description: "Kopie eines Beitrags als Entwurf anlegen.",
    procedure: "posts.duplicate",
    scope: WRITE,
  },
  {
    name: "delete_post",
    title: "Beitrag löschen",
    description:
      "Beitrag endgültig löschen. Nur nach ausdrücklicher Bestätigung durch die Person verwenden.",
    procedure: "posts.delete",
    scope: WRITE,
    destructive: true,
  },
  {
    name: "approve_post",
    title: "Beitrag freigeben",
    description:
      "Eingereichten Beitrag freigeben und veröffentlichen (Freigaberecht nötig).",
    procedure: "posts.approve",
    scope: WRITE,
  },
  {
    name: "reject_post",
    title: "Beitrag ablehnen",
    description:
      "Eingereichten Beitrag mit Begründung (reviewNotes) ablehnen (Freigaberecht nötig).",
    procedure: "posts.reject",
    scope: WRITE,
  },

  // ── Termine ────────────────────────────────────────────────────────────
  {
    name: "list_events",
    title: "Termine auflisten",
    description:
      "Termine, die die Person bearbeiten darf, inklusive Entwürfen. schedule: active (Standard, kommende), past, all.",
    procedure: "events.getDashboardEvents",
    scope: READ,
  },
  {
    name: "get_event",
    title: "Termin lesen",
    description: "Einen Termin vollständig lesen (per ID oder Slug).",
    procedure: "events.getById",
    scope: READ,
  },
  {
    name: "create_event",
    title: "Termin anlegen",
    description: `Neuen Termin anlegen. Kategorien: KONZERT, GOTTESDIENST, PROBE, ANDERE. Ort über locationId (list_locations), mitwirkendes Ensemble über ensembleId (list_ensembles) oder auswahlChorId. duration in Minuten. ${DATE_NOTE} ${MARKDOWN_NOTE} ${STATUS_NOTE}`,
    procedure: "events.create",
    scope: WRITE,
  },
  {
    name: "update_event",
    title: "Termin ändern",
    description: `Termin ändern; nur übergebene Felder ändern sich. ${DATE_NOTE} ${STATUS_NOTE}`,
    procedure: "events.update",
    scope: WRITE,
  },
  {
    name: "duplicate_event",
    title: "Termin duplizieren",
    description:
      "Kopie eines Termins als Entwurf anlegen, z. B. für eine Wiederholung.",
    procedure: "events.duplicate",
    scope: WRITE,
  },
  {
    name: "delete_event",
    title: "Termin löschen",
    description:
      "Termin endgültig löschen. Nur nach ausdrücklicher Bestätigung durch die Person verwenden; für eine Absage lieber update_event.",
    procedure: "events.delete",
    scope: WRITE,
    destructive: true,
  },
  {
    name: "approve_event",
    title: "Termin freigeben",
    description:
      "Eingereichten Termin freigeben und veröffentlichen (Freigaberecht nötig).",
    procedure: "events.approve",
    scope: WRITE,
  },
  {
    name: "reject_event",
    title: "Termin ablehnen",
    description:
      "Eingereichten Termin mit Begründung (reviewNotes) ablehnen (Freigaberecht nötig).",
    procedure: "events.reject",
    scope: WRITE,
  },

  // ── Kurse ──────────────────────────────────────────────────────────────
  {
    name: "list_courses",
    title: "Kurse auflisten",
    description:
      "Kurse/Lehrgänge, die die Person bearbeiten darf (auch als Kursteam), inklusive Entwürfen. schedule: active (Standard), past, all.",
    procedure: "courses.getDashboardCourses",
    scope: READ,
  },
  {
    name: "get_course",
    title: "Kurs lesen",
    description:
      "Einen Kurs vollständig lesen (per ID oder Slug), inklusive Preisoptionen und Zusatzfeldern.",
    procedure: "courses.getById",
    scope: READ,
  },
  {
    name: "create_course",
    title: "Kurs anlegen",
    description: `Neuen Kurs anlegen. courseType: LEHRGANG, FREIZEIT, WORKSHOP, KOMPONISTENPORTRAIT, VERANSTALTUNG, OTHER. Anmeldung, Preise (priceOptions) und Zusatzfelder (customFields) wie im Kursformular der Webseite; im Zweifel registrationOpen=false lassen und auf der Webseite prüfen. ${DATE_NOTE} ${MARKDOWN_NOTE} ${STATUS_NOTE}`,
    procedure: "courses.create",
    scope: WRITE,
  },
  {
    name: "update_course",
    title: "Kurs ändern",
    description: `Kurs ändern; nur übergebene Felder ändern sich. Achtung bei Preisen und Zusatzfeldern, wenn schon Anmeldungen vorliegen. ${DATE_NOTE} ${STATUS_NOTE}`,
    procedure: "courses.update",
    scope: WRITE,
  },
  {
    name: "duplicate_course",
    title: "Kurs duplizieren",
    description:
      "Kopie eines Kurses als Entwurf anlegen, z. B. für das nächste Jahr.",
    procedure: "courses.duplicate",
    scope: WRITE,
  },
  {
    name: "delete_course",
    title: "Kurs löschen",
    description:
      "Kurs endgültig löschen. Nur nach ausdrücklicher Bestätigung durch die Person verwenden.",
    procedure: "courses.delete",
    scope: WRITE,
    destructive: true,
  },
  {
    name: "approve_course",
    title: "Kurs freigeben",
    description:
      "Eingereichten Kurs freigeben und veröffentlichen (Freigaberecht nötig).",
    procedure: "courses.approve",
    scope: WRITE,
  },
  {
    name: "reject_course",
    title: "Kurs ablehnen",
    description:
      "Eingereichten Kurs mit Begründung (reviewNotes) ablehnen (Freigaberecht nötig).",
    procedure: "courses.reject",
    scope: WRITE,
  },

  // ── Ensembles (Posaunenchöre) ──────────────────────────────────────────
  {
    name: "list_ensembles",
    title: "Ensembles auflisten",
    description:
      "Posaunenchöre und Ensembles mit ID; Filter nach Bezirk und Freitext.",
    procedure: "ensembles.getAll",
    scope: READ,
  },
  {
    name: "get_ensemble",
    title: "Ensemble lesen",
    description: "Ein Ensemble vollständig lesen (per ID oder Slug).",
    procedure: "ensembles.getById",
    scope: READ,
  },
  {
    name: "create_ensemble",
    title: "Ensemble anlegen",
    description: `Neues Ensemble anlegen (Recht zur Ensembleverwaltung nötig). ${REHEARSAL_NOTE}`,
    procedure: "ensembles.create",
    restrictInput: restrictEnsembleInput,
    scope: WRITE,
  },
  {
    name: "update_ensemble",
    title: "Ensemble ändern",
    description: `Ensemble ändern; nur übergebene Felder ändern sich. Chorleitungen und Vertretungen dürfen ihr eigenes Ensemble pflegen. ${REHEARSAL_NOTE}`,
    procedure: "ensembles.update",
    restrictInput: restrictEnsembleInput,
    scope: WRITE,
  },
  {
    name: "delete_ensemble",
    title: "Ensemble löschen",
    description:
      "Ensemble endgültig löschen. Nur nach ausdrücklicher Bestätigung durch die Person verwenden; sonst lieber isActive=false.",
    procedure: "ensembles.delete",
    scope: WRITE,
    destructive: true,
  },
];

export const MCP_SERVER_INSTRUCTIONS = `Server der Webseite des Posaunenwerks Rheinland (Posaunenchöre der Evangelischen Kirche im Rheinland). Alle Werkzeuge handeln im Namen der angemeldeten Person und dürfen nur, was sie auch auf der Webseite darf.

Arbeitsweise:
- IDs (Bezirk, Ort, Ensemble, Bild) erst mit den list_-Werkzeugen nachschlagen, nie raten.
- Vor dem Ändern das Objekt mit get_ lesen; beim Ändern nur die Felder schicken, die sich ändern sollen.
- Neue Inhalte standardmäßig zur Freigabe einreichen (status PENDING) oder als Entwurf (DRAFT), es sei denn, die Person will ausdrücklich sofort veröffentlichen und hat das Recht dazu.
- Löschen nur nach ausdrücklicher Bestätigung.
- Persönliche Daten (E-Mail, Telefon, Anschrift von Personen, Geburtsdatum usw.) gibt der Server nicht heraus. Kontaktfelder beim Ändern nur setzen, wenn die Person sie ausdrücklich nennt.
- ${DATE_NOTE}
- ${MARKDOWN_NOTE}
- Texte auf Deutsch, in der Sprache der Webseite (du-Form, freundlich, sachlich).`;
