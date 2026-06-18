/**
 * Core System Permissions
 *
 * These permissions are hardcoded and seeded into the database as system permissions.
 * They represent the core functionality of the application and cannot be deleted/modified via UI.
 *
 * Permission keys follow the pattern: {resource}.{action}
 * Examples: events.create, posts.approve, users.manage
 */

export const PERMISSIONS = {
  // Events
  EVENTS_CREATE: "events.create",
  EVENTS_EDIT: "events.edit",
  EVENTS_DELETE: "events.delete",
  EVENTS_APPROVE: "events.approve",
  EVENTS_VIEW: "events.view",

  // Courses
  COURSES_CREATE: "courses.create",
  COURSES_EDIT: "courses.edit",
  COURSES_DELETE: "courses.delete",
  COURSES_APPROVE: "courses.approve",
  COURSES_VIEW: "courses.view",
  COURSES_MANAGE_REGISTRATIONS: "courses.manage_registrations",
  REGISTRATIONS_MARK_PAID: "registrations.mark_paid",

  // Posts
  POSTS_CREATE: "posts.create",
  POSTS_EDIT: "posts.edit",
  POSTS_DELETE: "posts.delete",
  POSTS_APPROVE: "posts.approve",
  POSTS_VIEW: "posts.view",

  // Users
  USERS_MANAGE: "users.manage",
  USERS_VIEW: "users.view",
  USERS_EDIT_ROLES: "users.edit_roles",

  // Media
  MEDIA_UPLOAD: "media.upload",
  MEDIA_EDIT: "media.edit",
  MEDIA_DELETE: "media.delete",
  MEDIA_APPROVE: "media.approve",
  MEDIA_VIEW: "media.view",

  // Downloads
  DOWNLOADS_UPLOAD: "downloads.upload",
  DOWNLOADS_EDIT: "downloads.edit",
  DOWNLOADS_DELETE: "downloads.delete",
  DOWNLOADS_APPROVE: "downloads.approve",
  DOWNLOADS_VIEW: "downloads.view",

  // Organization
  ORGANIZATION_MANAGE_TEAM: "organization.manage_team",
  ORGANIZATION_MANAGE_VORSTAND: "organization.manage_vorstand",
  ORGANIZATION_MANAGE_POSAUNENRAT: "organization.manage_posaunenrat",
  ORGANIZATION_MANAGE_FOERDERVEREIN: "organization.manage_foerderverein",
  ORGANIZATION_MANAGE_POSAUNENWARTE: "organization.manage_posaunenwarte",
  ORGANIZATION_MANAGE_ENSEMBLES: "organization.manage_ensembles",
  ORGANIZATION_MANAGE_AUSWAHLCHOERE: "organization.manage_auswahlchoere",
  ORGANIZATION_MANAGE_BEZIRKE: "organization.manage_bezirke",
  ORGANIZATION_MANAGE_LOCATIONS: "organization.manage_locations",

  // Homepage
  HOMEPAGE_MANAGE: "homepage.manage",

  // Newsletter
  NEWSLETTER_MANAGE: "newsletter.manage",
  NEWSLETTER_SEND: "newsletter.send",

  // Statistics
  STATS_VIEW: "stats.view",

  // Data Export/Import
  DATA_EXPORT: "data.export",
  DATA_IMPORT: "data.import",

  // Invoices/Billing
  INVOICES_GENERATE: "invoices.generate",
  INVOICES_VIEW: "invoices.view",
  INVOICES_MANAGE: "invoices.manage",

  // System Administration
  SYSTEM_MANAGE: "system.manage",
  SYSTEM_VIEW_LOGS: "system.view_logs",
  SYSTEM_BACKUP: "system.backup",

  // Email Management
  EMAIL_MANAGE_TEMPLATES: "email.manage_templates",
  EMAIL_MANAGE_SETTINGS: "email.manage_settings",

  // Ensembles & Auswahlchoere
  ENSEMBLES_DELETE: "ensembles.delete",
  AUSWAHLCHOERE_DELETE: "auswahlchoere.delete",

  // Advanced User Management
  USERS_MANAGE_2FA: "users.manage_2fa",
  USERS_IMPERSONATE: "users.impersonate",

  // Content Moderation
  CONTENT_BULK_MODERATE: "content.bulk_moderate",
  CONTENT_ARCHIVE: "content.archive",

  // Permissions Management (meta-permission)
  PERMISSIONS_MANAGE: "permissions.manage",

  // Organization History
  ORGANIZATION_MANAGE_HISTORY: "organization.manage_history",

  // Bläserhefte
  DOWNLOADS_MANAGE_BLAESERHEFTE: "downloads.manage_blaeserhefte",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

import { z } from "zod";

export const VALID_PERMISSION_KEYS = new Set<string>(Object.values(PERMISSIONS));

export const permissionKeySchema = z.string().refine(
  (key) => VALID_PERMISSION_KEYS.has(key),
  { message: "Invalid permission key" },
);

/**
 * Permission definitions for seeding
 * These are used to create system permissions in the database
 */
export const PERMISSION_DEFINITIONS: Array<{
  key: PermissionKey;
  name: string;
  description: string;
  category: string;
}> = [
  // Events
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

  // Courses
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
    key: PERMISSIONS.REGISTRATIONS_MARK_PAID,
    name: "Anmeldungen als bezahlt markieren",
    description:
      "Berechtigung, den Zahlungsstatus von Kursanmeldungen auf „bezahlt“ zu setzen",
    category: "courses",
  },

  // Posts
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

  // Users
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

  // Media
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

  // Downloads
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

  // Organization
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

  // Homepage
  {
    key: PERMISSIONS.HOMEPAGE_MANAGE,
    name: "Homepage verwalten",
    description: "Berechtigung zum Verwalten der Homepage",
    category: "homepage",
  },

  // Newsletter
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

  // Statistics
  {
    key: PERMISSIONS.STATS_VIEW,
    name: "Statistiken ansehen",
    description: "Berechtigung zum Ansehen von Statistiken",
    category: "stats",
  },

  // Data Export/Import
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

  // Invoices/Billing
  {
    key: PERMISSIONS.INVOICES_GENERATE,
    name: "Rechnungen erstellen",
    description: "Berechtigung zum Erstellen von Rechnungen",
    category: "invoices",
  },
  {
    key: PERMISSIONS.INVOICES_VIEW,
    name: "Rechnungen ansehen",
    description: "Berechtigung zum Ansehen von Rechnungen",
    category: "invoices",
  },
  {
    key: PERMISSIONS.INVOICES_MANAGE,
    name: "Rechnungen verwalten",
    description: "Berechtigung zum Verwalten von Rechnungen und Zahlungsstatus",
    category: "invoices",
  },

  // System Administration
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

  // Email Management
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

  // Ensembles & Auswahlchoere
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

  // Advanced User Management
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

  // Content Moderation
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

  // Permissions Management
  {
    key: PERMISSIONS.PERMISSIONS_MANAGE,
    name: "Berechtigungen verwalten",
    description: "Berechtigung zum Verwalten von Berechtigungen und Rollen",
    category: "permissions",
  },

  // Organization History
  {
    key: PERMISSIONS.ORGANIZATION_MANAGE_HISTORY,
    name: "Historie verwalten",
    description: "Berechtigung zum Verwalten der Vereinschronik",
    category: "organization",
  },

  // Bläserhefte
  {
    key: PERMISSIONS.DOWNLOADS_MANAGE_BLAESERHEFTE,
    name: "Bläserhefte verwalten",
    description: "Berechtigung zum Verwalten von Bläserheften",
    category: "downloads",
  },
];
