/**
 * System permissions, seeded into the database and not editable via UI.
 * Keys follow `{resource}.{action}`.
 */

export const PERMISSIONS = {
  EVENTS_CREATE: "events.create",
  EVENTS_EDIT: "events.edit",
  EVENTS_DELETE: "events.delete",
  EVENTS_APPROVE: "events.approve",
  EVENTS_VIEW: "events.view",

  COURSES_CREATE: "courses.create",
  COURSES_EDIT: "courses.edit",
  COURSES_DELETE: "courses.delete",
  COURSES_APPROVE: "courses.approve",
  COURSES_VIEW: "courses.view",
  COURSES_MANAGE_REGISTRATIONS: "courses.manage_registrations",
  COURSES_ENABLE_INVOICING: "courses.enable_invoicing",
  COURSES_ENABLE_DOWN_PAYMENT: "courses.enable_down_payment",
  REGISTRATIONS_MARK_PAID: "registrations.mark_paid",
  REGISTRATIONS_MANAGE_SIBLING_DISCOUNT:
    "registrations.manage_sibling_discount",

  POSTS_CREATE: "posts.create",
  POSTS_EDIT: "posts.edit",
  POSTS_DELETE: "posts.delete",
  POSTS_APPROVE: "posts.approve",
  POSTS_VIEW: "posts.view",

  USERS_MANAGE: "users.manage",
  USERS_VIEW: "users.view",
  USERS_EDIT_ROLES: "users.edit_roles",

  MEDIA_UPLOAD: "media.upload",
  MEDIA_EDIT: "media.edit",
  MEDIA_DELETE: "media.delete",
  MEDIA_APPROVE: "media.approve",
  MEDIA_VIEW: "media.view",

  DOWNLOADS_UPLOAD: "downloads.upload",
  DOWNLOADS_EDIT: "downloads.edit",
  DOWNLOADS_DELETE: "downloads.delete",
  DOWNLOADS_APPROVE: "downloads.approve",
  DOWNLOADS_VIEW: "downloads.view",

  ORGANIZATION_MANAGE_TEAM: "organization.manage_team",
  ORGANIZATION_MANAGE_VORSTAND: "organization.manage_vorstand",
  ORGANIZATION_MANAGE_POSAUNENRAT: "organization.manage_posaunenrat",
  ORGANIZATION_MANAGE_FOERDERVEREIN: "organization.manage_foerderverein",
  ORGANIZATION_MANAGE_POSAUNENWARTE: "organization.manage_posaunenwarte",
  ORGANIZATION_MANAGE_ENSEMBLES: "organization.manage_ensembles",
  ORGANIZATION_MANAGE_AUSWAHLCHOERE: "organization.manage_auswahlchoere",
  ORGANIZATION_MANAGE_BEZIRKE: "organization.manage_bezirke",
  ORGANIZATION_MANAGE_LOCATIONS: "organization.manage_locations",

  HOMEPAGE_MANAGE: "homepage.manage",

  NEWSLETTER_MANAGE: "newsletter.manage",
  NEWSLETTER_SEND: "newsletter.send",

  STATS_VIEW: "stats.view",

  DATA_EXPORT: "data.export",
  DATA_IMPORT: "data.import",

  INVOICES_GENERATE: "invoices.generate",
  INVOICES_VIEW: "invoices.view",
  INVOICES_MANAGE: "invoices.manage",

  SYSTEM_MANAGE: "system.manage",
  SYSTEM_VIEW_LOGS: "system.view_logs",
  SYSTEM_BACKUP: "system.backup",

  EMAIL_MANAGE_TEMPLATES: "email.manage_templates",
  EMAIL_MANAGE_SETTINGS: "email.manage_settings",

  ENSEMBLES_DELETE: "ensembles.delete",
  AUSWAHLCHOERE_DELETE: "auswahlchoere.delete",

  USERS_MANAGE_2FA: "users.manage_2fa",
  USERS_IMPERSONATE: "users.impersonate",

  CONTENT_BULK_MODERATE: "content.bulk_moderate",
  CONTENT_ARCHIVE: "content.archive",

  PERMISSIONS_MANAGE: "permissions.manage",

  AUDIT_VIEW: "audit.view",

  ORGANIZATION_MANAGE_HISTORY: "organization.manage_history",

  DOWNLOADS_MANAGE_BLAESERHEFTE: "downloads.manage_blaeserhefte",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

import { z } from "zod";

export const VALID_PERMISSION_KEYS = new Set<string>(
  Object.values(PERMISSIONS),
);

export const permissionKeySchema = z
  .string()
  .refine((key) => VALID_PERMISSION_KEYS.has(key), {
    message: "Invalid permission key",
  });

/** Seed data for the system permissions. */
export const PERMISSION_DEFINITIONS: Array<{
  key: PermissionKey;
  name: string;
  description: string;
  category: string;
}> = [
  {
    key: PERMISSIONS.EVENTS_CREATE,
    name: "Events erstellen",
    description: "Berechtigung zum Erstellen neuer Veranstaltungen",
    category: "events",
  },
  {
    key: PERMISSIONS.EVENTS_EDIT,
    name: "Events bearbeiten",
    description: "Berechtigung zum Bearbeiten von Veranstaltungen",
    category: "events",
  },
  {
    key: PERMISSIONS.EVENTS_DELETE,
    name: "Events löschen",
    description: "Berechtigung zum Löschen von Veranstaltungen",
    category: "events",
  },
  {
    key: PERMISSIONS.EVENTS_APPROVE,
    name: "Events genehmigen",
    description: "Berechtigung zum Genehmigen von Veranstaltungen",
    category: "events",
  },
  {
    key: PERMISSIONS.EVENTS_VIEW,
    name: "Events ansehen",
    description: "Berechtigung zum Ansehen von Veranstaltungen",
    category: "events",
  },

  {
    key: PERMISSIONS.COURSES_CREATE,
    name: "Kurse erstellen",
    description: "Berechtigung zum Erstellen neuer Kurse",
    category: "courses",
  },
  {
    key: PERMISSIONS.COURSES_EDIT,
    name: "Kurse bearbeiten",
    description: "Berechtigung zum Bearbeiten von Kursen",
    category: "courses",
  },
  {
    key: PERMISSIONS.COURSES_DELETE,
    name: "Kurse löschen",
    description: "Berechtigung zum Löschen von Kursen",
    category: "courses",
  },
  {
    key: PERMISSIONS.COURSES_APPROVE,
    name: "Kurse genehmigen",
    description: "Berechtigung zum Genehmigen von Kursen",
    category: "courses",
  },
  {
    key: PERMISSIONS.COURSES_VIEW,
    name: "Kurse ansehen",
    description: "Berechtigung zum Ansehen von Kursen",
    category: "courses",
  },
  {
    key: PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
    name: "Kursanmeldungen verwalten",
    description: "Berechtigung zum Verwalten von Kursanmeldungen",
    category: "courses",
  },
  {
    key: PERMISSIONS.COURSES_ENABLE_INVOICING,
    name: "Rechnungsstellung für Kurse freischalten",
    description:
      "Berechtigung, beim Anlegen oder Bearbeiten eines Kurses festzulegen, ob für ihn Rechnungen erstellt werden dürfen",
    category: "courses",
  },
  {
    key: PERMISSIONS.COURSES_ENABLE_DOWN_PAYMENT,
    name: "Anzahlungen für Kurse festlegen",
    description:
      "Berechtigung, für einen Kurs eine Anzahlung (pro Teilnehmer oder je Preiskategorie) und die Kursnummer für deren Verwendungszweck festzulegen",
    category: "courses",
  },
  {
    key: PERMISSIONS.REGISTRATIONS_MARK_PAID,
    name: "Anmeldungen als bezahlt markieren",
    description:
      "Berechtigung, den Zahlungsstatus von Kursanmeldungen auf „bezahlt“ zu setzen",
    category: "courses",
  },
  {
    key: PERMISSIONS.REGISTRATIONS_MANAGE_SIBLING_DISCOUNT,
    name: "Geschwisterkindrabatt verwalten",
    description:
      "Berechtigung, den Geschwisterkindrabatt für Kurse freizuschalten, ihn für einzelne Anmeldungen nachträglich zu gewähren und beantragte Rabatte zu genehmigen oder abzulehnen",
    category: "courses",
  },

  {
    key: PERMISSIONS.POSTS_CREATE,
    name: "Beiträge erstellen",
    description: "Berechtigung zum Erstellen neuer Beiträge",
    category: "posts",
  },
  {
    key: PERMISSIONS.POSTS_EDIT,
    name: "Beiträge bearbeiten",
    description: "Berechtigung zum Bearbeiten von Beiträgen",
    category: "posts",
  },
  {
    key: PERMISSIONS.POSTS_DELETE,
    name: "Beiträge löschen",
    description: "Berechtigung zum Löschen von Beiträgen",
    category: "posts",
  },
  {
    key: PERMISSIONS.POSTS_APPROVE,
    name: "Beiträge genehmigen",
    description: "Berechtigung zum Genehmigen von Beiträgen",
    category: "posts",
  },
  {
    key: PERMISSIONS.POSTS_VIEW,
    name: "Beiträge ansehen",
    description: "Berechtigung zum Ansehen von Beiträgen",
    category: "posts",
  },

  {
    key: PERMISSIONS.USERS_MANAGE,
    name: "Benutzer verwalten",
    description: "Berechtigung zum Verwalten von Benutzern",
    category: "users",
  },
  {
    key: PERMISSIONS.USERS_VIEW,
    name: "Benutzer ansehen",
    description: "Berechtigung zum Ansehen von Benutzern",
    category: "users",
  },
  {
    key: PERMISSIONS.USERS_EDIT_ROLES,
    name: "Benutzerrollen bearbeiten",
    description: "Berechtigung zum Bearbeiten von Benutzerrollen",
    category: "users",
  },

  {
    key: PERMISSIONS.MEDIA_UPLOAD,
    name: "Medien hochladen",
    description: "Berechtigung zum Hochladen von Medien",
    category: "media",
  },
  {
    key: PERMISSIONS.MEDIA_EDIT,
    name: "Medien bearbeiten",
    description: "Berechtigung zum Bearbeiten von Medien",
    category: "media",
  },
  {
    key: PERMISSIONS.MEDIA_DELETE,
    name: "Medien löschen",
    description: "Berechtigung zum Löschen von Medien",
    category: "media",
  },
  {
    key: PERMISSIONS.MEDIA_APPROVE,
    name: "Medien genehmigen",
    description: "Berechtigung zum Genehmigen von Medien",
    category: "media",
  },
  {
    key: PERMISSIONS.MEDIA_VIEW,
    name: "Medien ansehen",
    description: "Berechtigung zum Ansehen von Medien",
    category: "media",
  },

  {
    key: PERMISSIONS.DOWNLOADS_UPLOAD,
    name: "Downloads hochladen",
    description: "Berechtigung zum Hochladen von Downloads",
    category: "downloads",
  },
  {
    key: PERMISSIONS.DOWNLOADS_EDIT,
    name: "Downloads bearbeiten",
    description: "Berechtigung zum Bearbeiten von Downloads",
    category: "downloads",
  },
  {
    key: PERMISSIONS.DOWNLOADS_DELETE,
    name: "Downloads löschen",
    description: "Berechtigung zum Löschen von Downloads",
    category: "downloads",
  },
  {
    key: PERMISSIONS.DOWNLOADS_APPROVE,
    name: "Downloads genehmigen",
    description: "Berechtigung zum Genehmigen von Downloads",
    category: "downloads",
  },
  {
    key: PERMISSIONS.DOWNLOADS_VIEW,
    name: "Downloads ansehen",
    description: "Berechtigung zum Ansehen von Downloads",
    category: "downloads",
  },

  {
    key: PERMISSIONS.ORGANIZATION_MANAGE_TEAM,
    name: "Team verwalten",
    description: "Berechtigung zum Verwalten des Teams",
    category: "organization",
  },
  {
    key: PERMISSIONS.ORGANIZATION_MANAGE_VORSTAND,
    name: "Vorstand verwalten",
    description: "Berechtigung zum Verwalten des Vorstands",
    category: "organization",
  },
  {
    key: PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENRAT,
    name: "Posaunenrat verwalten",
    description: "Berechtigung zum Verwalten des Posaunenrats",
    category: "organization",
  },
  {
    key: PERMISSIONS.ORGANIZATION_MANAGE_FOERDERVEREIN,
    name: "Förderverein verwalten",
    description: "Berechtigung zum Verwalten des Fördervereins",
    category: "organization",
  },
  {
    key: PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENWARTE,
    name: "Posaunenwarte verwalten",
    description: "Berechtigung zum Verwalten der Posaunenwarte",
    category: "organization",
  },
  {
    key: PERMISSIONS.ORGANIZATION_MANAGE_ENSEMBLES,
    name: "Ensembles verwalten",
    description: "Berechtigung zum Verwalten von Ensembles",
    category: "organization",
  },
  {
    key: PERMISSIONS.ORGANIZATION_MANAGE_AUSWAHLCHOERE,
    name: "Auswahlchöre verwalten",
    description: "Berechtigung zum Verwalten von Auswahlchören",
    category: "organization",
  },
  {
    key: PERMISSIONS.ORGANIZATION_MANAGE_BEZIRKE,
    name: "Bezirke verwalten",
    description: "Berechtigung zum Verwalten von Bezirken",
    category: "organization",
  },
  {
    key: PERMISSIONS.ORGANIZATION_MANAGE_LOCATIONS,
    name: "Veranstaltungsorte verwalten",
    description: "Berechtigung zum Verwalten von Veranstaltungsorten",
    category: "organization",
  },

  {
    key: PERMISSIONS.HOMEPAGE_MANAGE,
    name: "Homepage verwalten",
    description: "Berechtigung zum Verwalten der Homepage",
    category: "homepage",
  },

  {
    key: PERMISSIONS.NEWSLETTER_MANAGE,
    name: "Newsletter verwalten",
    description: "Berechtigung zum Verwalten des Newsletters",
    category: "newsletter",
  },
  {
    key: PERMISSIONS.NEWSLETTER_SEND,
    name: "Newsletter versenden",
    description: "Berechtigung zum Versenden von Newslettern",
    category: "newsletter",
  },

  {
    key: PERMISSIONS.STATS_VIEW,
    name: "Statistiken ansehen",
    description: "Berechtigung zum Ansehen von Statistiken",
    category: "stats",
  },

  {
    key: PERMISSIONS.DATA_EXPORT,
    name: "Daten exportieren",
    description: "Berechtigung zum Exportieren von Daten",
    category: "data",
  },
  {
    key: PERMISSIONS.DATA_IMPORT,
    name: "Daten importieren",
    description: "Berechtigung zum Importieren von Daten",
    category: "data",
  },

  {
    key: PERMISSIONS.INVOICES_GENERATE,
    name: "Rechnungen erstellen",
    description:
      "Berechtigung, für beliebige Kurse Rechnungen zu erstellen, zu bearbeiten und zu veröffentlichen (Kurs-Organisatoren dürfen das für ihre eigenen Kurse ohnehin)",
    category: "invoices",
  },
  {
    key: PERMISSIONS.INVOICES_VIEW,
    name: "Rechnungsarchiv ansehen",
    description:
      "Berechtigung zum Einsehen aller erstellten Rechnungen im Rechnungsarchiv",
    category: "invoices",
  },
  {
    key: PERMISSIONS.INVOICES_MANAGE,
    name: "Rechnungen verwalten",
    description: "Berechtigung zum Verwalten von Rechnungen und Zahlungsstatus",
    category: "invoices",
  },

  {
    key: PERMISSIONS.SYSTEM_MANAGE,
    name: "System verwalten",
    description: "Berechtigung zum Verwalten von Systemeinstellungen",
    category: "system",
  },
  {
    key: PERMISSIONS.SYSTEM_VIEW_LOGS,
    name: "System-Logs ansehen",
    description: "Berechtigung zum Ansehen von System-Logs und Audit-Trails",
    category: "system",
  },
  {
    key: PERMISSIONS.SYSTEM_BACKUP,
    name: "Backups verwalten",
    description: "Berechtigung zum Erstellen und Wiederherstellen von Backups",
    category: "system",
  },

  {
    key: PERMISSIONS.EMAIL_MANAGE_TEMPLATES,
    name: "E-Mail-Vorlagen verwalten",
    description: "Berechtigung zum Verwalten von E-Mail-Vorlagen",
    category: "email",
  },
  {
    key: PERMISSIONS.EMAIL_MANAGE_SETTINGS,
    name: "E-Mail-Einstellungen verwalten",
    description: "Berechtigung zum Verwalten von E-Mail-Konfigurationen",
    category: "email",
  },

  {
    key: PERMISSIONS.ENSEMBLES_DELETE,
    name: "Ensembles löschen",
    description: "Berechtigung zum Löschen von Ensembles",
    category: "ensembles",
  },
  {
    key: PERMISSIONS.AUSWAHLCHOERE_DELETE,
    name: "Auswahlchöre löschen",
    description: "Berechtigung zum Löschen von Auswahlchören",
    category: "auswahlchoere",
  },

  {
    key: PERMISSIONS.USERS_MANAGE_2FA,
    name: "2FA für Benutzer verwalten",
    description:
      "Berechtigung zum Verwalten der Zwei-Faktor-Authentifizierung für andere Benutzer",
    category: "users",
  },
  {
    key: PERMISSIONS.USERS_IMPERSONATE,
    name: "Benutzer imitieren",
    description: "Berechtigung zum Imitieren von Benutzern (für Support)",
    category: "users",
  },

  {
    key: PERMISSIONS.CONTENT_BULK_MODERATE,
    name: "Inhalte massenweise moderieren",
    description:
      "Berechtigung zum Massen-Genehmigen oder -Ablehnen von Inhalten",
    category: "content",
  },
  {
    key: PERMISSIONS.CONTENT_ARCHIVE,
    name: "Inhalte archivieren",
    description: "Berechtigung zum Archivieren von alten Inhalten",
    category: "content",
  },

  {
    key: PERMISSIONS.PERMISSIONS_MANAGE,
    name: "Berechtigungen verwalten",
    description: "Berechtigung zum Verwalten von Berechtigungen und Rollen",
    category: "permissions",
  },
  {
    key: PERMISSIONS.AUDIT_VIEW,
    name: "Audit-Log einsehen",
    description:
      "Berechtigung zum Einsehen des Audit-Logs (sicherheitsrelevante Aktionen)",
    category: "system",
  },

  {
    key: PERMISSIONS.ORGANIZATION_MANAGE_HISTORY,
    name: "Historie verwalten",
    description: "Berechtigung zum Verwalten der Vereinschronik",
    category: "organization",
  },

  {
    key: PERMISSIONS.DOWNLOADS_MANAGE_BLAESERHEFTE,
    name: "Bläserhefte verwalten",
    description: "Berechtigung zum Verwalten von Bläserheften",
    category: "downloads",
  },
];
