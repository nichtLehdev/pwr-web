import {
  BadgeCheck,
  BarChart3,
  BookOpen,
  Calendar,
  Clock,
  Download,
  FileText,
  GraduationCap,
  Heart,
  ImageIcon,
  Layout,
  Mail,
  Map,
  MapPin,
  Music,
  Shield,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions";

/**
 * Shared navigation model for the admin dashboard.
 *
 * Single source of truth for the home card grid (src/app/dashboard/page.tsx)
 * and the persistent sidebar (dashboard-sidebar.tsx) — groups, items, hrefs,
 * icons and permission conditions live here so the two never drift.
 */

export interface DashboardNavContext {
  hasPermission: (key: PermissionKey) => boolean;
  hasAnyPermission: (keys: PermissionKey[]) => boolean;
  /** api.stats.canViewStats query result (false while loading). */
  canViewStats: boolean;
  /** api.permissions.canManage query result (false while loading). */
  canManagePermissions: boolean;
}

export interface DashboardNavItem {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  visible: (ctx: DashboardNavContext) => boolean;
}

export interface DashboardNavGroup {
  title: string;
  description: string;
  /** Column count of the card grid on the dashboard home page at lg. */
  cardColumns: 3 | 4;
  items: DashboardNavItem[];
}

const always = () => true;

const canManageMedia = (ctx: DashboardNavContext) =>
  ctx.hasAnyPermission([
    PERMISSIONS.MEDIA_VIEW,
    PERMISSIONS.MEDIA_UPLOAD,
    PERMISSIONS.MEDIA_EDIT,
    PERMISSIONS.MEDIA_DELETE,
    PERMISSIONS.MEDIA_APPROVE,
  ]);

const canManageDownloads = (ctx: DashboardNavContext) =>
  ctx.hasAnyPermission([
    PERMISSIONS.DOWNLOADS_VIEW,
    PERMISSIONS.DOWNLOADS_UPLOAD,
    PERMISSIONS.DOWNLOADS_EDIT,
    PERMISSIONS.DOWNLOADS_DELETE,
    PERMISSIONS.DOWNLOADS_APPROVE,
  ]);

const canExportImport = (ctx: DashboardNavContext) =>
  ctx.hasAnyPermission([PERMISSIONS.DATA_EXPORT, PERMISSIONS.DATA_IMPORT]);

export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  {
    title: "Inhalte",
    description: "Verwalte Veranstaltungen, Kurse, Beiträge und mehr",
    cardColumns: 4,
    items: [
      {
        title: "Termine",
        description: "Veranstaltungen verwalten",
        href: "/dashboard/events",
        icon: Calendar,
        visible: always,
      },
      {
        title: "Kurse",
        description: "Kurse & Anmeldungen",
        href: "/dashboard/courses",
        icon: GraduationCap,
        visible: always,
      },
      {
        title: "Beiträge",
        description: "News & Artikel",
        href: "/dashboard/posts",
        icon: FileText,
        visible: always,
      },
      {
        title: "Geschichte",
        description: "Historische Ereignisse",
        href: "/dashboard/history-timeline",
        icon: Clock,
        visible: always,
      },
      {
        title: "Anmeldungen",
        description: "Alle Kursanmeldungen",
        href: "/dashboard/registrations",
        icon: Users,
        visible: (ctx) =>
          ctx.hasPermission(PERMISSIONS.COURSES_MANAGE_REGISTRATIONS),
      },
    ],
  },
  {
    title: "Organisation",
    description: "Bezirke, Ensembles, Auswahlchöre und Veranstaltungsorte",
    cardColumns: 4,
    items: [
      {
        title: "Bezirke",
        description: "Bezirke & Regionen",
        href: "/dashboard/bezirke",
        icon: Map,
        visible: (ctx) =>
          ctx.hasPermission(PERMISSIONS.ORGANIZATION_MANAGE_BEZIRKE),
      },
      {
        title: "Ensembles",
        description: "Bläsergruppen",
        href: "/dashboard/ensembles",
        icon: Users,
        visible: (ctx) =>
          ctx.hasPermission(PERMISSIONS.ORGANIZATION_MANAGE_ENSEMBLES),
      },
      {
        title: "Auswahlchöre",
        description: "Auswahlchöre verwalten",
        href: "/dashboard/auswahlchoere",
        icon: Music,
        visible: (ctx) =>
          ctx.hasPermission(PERMISSIONS.ORGANIZATION_MANAGE_AUSWAHLCHOERE),
      },
      {
        title: "Veranstaltungsorte",
        description: "Locations verwalten",
        href: "/dashboard/locations",
        icon: MapPin,
        visible: (ctx) =>
          ctx.hasPermission(PERMISSIONS.ORGANIZATION_MANAGE_LOCATIONS),
      },
    ],
  },
  {
    title: "Personen & Gremien",
    description: "Benutzer, Vorstand, Team und weitere Gremien verwalten",
    cardColumns: 3,
    items: [
      {
        title: "Benutzer",
        description: "Benutzerkonten verwalten",
        href: "/dashboard/users",
        icon: User,
        visible: (ctx) => ctx.hasPermission(PERMISSIONS.USERS_MANAGE),
      },
      {
        title: "Vorstand",
        description: "Vorstandsmitglieder",
        href: "/dashboard/vorstand",
        icon: Users,
        visible: (ctx) =>
          ctx.hasPermission(PERMISSIONS.ORGANIZATION_MANAGE_VORSTAND),
      },
      {
        title: "Team",
        description: "Teammitglieder",
        href: "/dashboard/team",
        icon: Users,
        visible: (ctx) =>
          ctx.hasPermission(PERMISSIONS.ORGANIZATION_MANAGE_TEAM),
      },
      {
        title: "Posaunenrat",
        description: "Posaunenratsmitglieder",
        href: "/dashboard/posaunenrat",
        icon: BadgeCheck,
        visible: (ctx) =>
          ctx.hasPermission(PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENRAT),
      },
      {
        title: "Förderverein",
        description: "Fördervereins-Mitglieder",
        href: "/dashboard/foerderverein",
        icon: Heart,
        visible: (ctx) =>
          ctx.hasPermission(PERMISSIONS.ORGANIZATION_MANAGE_FOERDERVEREIN),
      },
      {
        title: "Posaunenwarte",
        description: "LPW & RPW verwalten",
        href: "/dashboard/posaunenwarte",
        icon: Music,
        visible: (ctx) =>
          ctx.hasPermission(PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENWARTE),
      },
    ],
  },
  {
    title: "Medien & Ressourcen",
    description: "Medien, Downloads, Bläserhefte und Newsletter",
    cardColumns: 4,
    items: [
      {
        title: "Homepage",
        description: "Homepage Bildkarussell",
        href: "/dashboard/homepage",
        icon: Layout,
        visible: (ctx) => ctx.hasPermission(PERMISSIONS.HOMEPAGE_MANAGE),
      },
      {
        title: "Medien",
        description: "Bilder & Dateien",
        href: "/dashboard/media",
        icon: ImageIcon,
        visible: canManageMedia,
      },
      {
        title: "Downloads",
        description: "Downloadbare Dateien",
        href: "/dashboard/downloads",
        icon: Download,
        visible: canManageDownloads,
      },
      {
        title: "Bläserhefte",
        description: "Notenhefte verwalten",
        href: "/dashboard/blaeserhefte",
        icon: BookOpen,
        visible: (ctx) =>
          ctx.hasPermission(PERMISSIONS.DOWNLOADS_MANAGE_BLAESERHEFTE),
      },
      {
        title: "Newsletter",
        description: "Abonnenten verwalten",
        href: "/dashboard/newsletter",
        icon: Mail,
        visible: (ctx) => ctx.hasPermission(PERMISSIONS.NEWSLETTER_MANAGE),
      },
    ],
  },
  {
    title: "System & Verwaltung",
    description: "Statistiken, Berechtigungen und Datenverwaltung",
    cardColumns: 3,
    items: [
      {
        title: "Export & Import",
        description: "Daten exportieren und importieren",
        href: "/dashboard/export-import",
        icon: Download,
        visible: canExportImport,
      },
      {
        title: "Statistik",
        description: "Anonyme Seitenaufrufe",
        href: "/dashboard/stats",
        icon: BarChart3,
        visible: (ctx) => ctx.canViewStats,
      },
      {
        title: "Berechtigungen",
        description: "Rollen & Berechtigungen verwalten",
        href: "/dashboard/permissions",
        icon: Shield,
        visible: (ctx) => ctx.canManagePermissions,
      },
      {
        title: "Audit-Log",
        description: "Sicherheitsrelevante Aktionen",
        href: "/dashboard/audit",
        icon: Shield,
        visible: (ctx) => ctx.hasPermission(PERMISSIONS.AUDIT_VIEW),
      },
    ],
  },
];

/**
 * Groups filtered down to the items the current user may see.
 * Groups without any permitted item are dropped entirely — this matches the
 * previous per-section conditions on the dashboard home page exactly (each
 * section was gated on the OR of its items' conditions).
 */
export function getVisibleNavGroups(
  ctx: DashboardNavContext,
): DashboardNavGroup[] {
  return DASHBOARD_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.visible(ctx)),
  })).filter((group) => group.items.length > 0);
}
