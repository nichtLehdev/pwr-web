import { describe, expect, it } from "@jest/globals";
import {
  formatMaintenanceUntil,
  MAINTENANCE_PATH,
  isInfrastructurePath,
  isMaintenanceAllowedPath,
} from "../maintenance";

describe("isMaintenanceAllowedPath", () => {
  it("lässt Anmeldung und Dashboard durch — sonst sperrt sich die Redaktion aus", () => {
    for (const path of [
      "/login",
      "/dashboard",
      "/dashboard/wartung",
      "/dashboard/courses/abc/participants",
      "/settings",
      "/reset-password",
      "/verify-2fa",
    ]) {
      expect(isMaintenanceAllowedPath(path)).toBe(true);
    }
  });

  it("lässt die Auskunftsroute durch, die die Middleware selbst abfragt", () => {
    expect(isMaintenanceAllowedPath("/api/maintenance")).toBe(true);
    expect(isMaintenanceAllowedPath("/api/maintenance/bypass")).toBe(true);
  });

  it("lässt die Wartungsseite selbst durch", () => {
    expect(isMaintenanceAllowedPath(MAINTENANCE_PATH)).toBe(true);
  });

  it("sperrt die öffentlichen Seiten", () => {
    for (const path of [
      "/",
      "/termine",
      "/aktuelles",
      "/kontakt",
      "/foerderverein",
      "/ueber-uns/bezirke",
      "/termine/kurs/abc/anmelden",
    ]) {
      expect(isMaintenanceAllowedPath(path)).toBe(false);
    }
  });

  it("greift nur auf Segmentgrenzen, nicht auf Namenspräfixe", () => {
    expect(isMaintenanceAllowedPath("/loginentwurf")).toBe(false);
    expect(isMaintenanceAllowedPath("/dashboards")).toBe(false);
    expect(isMaintenanceAllowedPath("/settings-alt")).toBe(false);
  });
});

describe("isInfrastructurePath", () => {
  it("fasst Next-Assets und Metadateien nicht an", () => {
    for (const path of [
      "/_next/static/chunks/main.js",
      "/favicon.ico",
      "/robots.txt",
      "/sitemap.xml",
      "/manifest.webmanifest",
      "/sw.js",
    ]) {
      expect(isInfrastructurePath(path)).toBe(true);
    }
  });

  it("hält normale Seiten nicht für Infrastruktur", () => {
    expect(isInfrastructurePath("/")).toBe(false);
    expect(isInfrastructurePath("/termine")).toBe(false);
    expect(isInfrastructurePath("/sitemap-hinweise")).toBe(false);
  });
});

describe("formatMaintenanceUntil", () => {
  // Die Wartungsseite rendert auf dem Server (UTC). Eingetragen wird im
  // Dashboard in deutscher Ortszeit, angezeigt werden muss dieselbe Uhrzeit.
  it("zeigt 23:59 deutscher Sommerzeit als 23:59, nicht als 21:59", () => {
    expect(formatMaintenanceUntil("2026-09-18T21:59:00.000Z")).toBe(
      "Freitag, 18. September 2026 um 23:59",
    );
  });

  it("zeigt 23:59 deutscher Winterzeit als 23:59, nicht als 22:59", () => {
    expect(formatMaintenanceUntil("2026-12-04T22:59:00.000Z")).toBe(
      "Freitag, 4. Dezember 2026 um 23:59",
    );
  });

  it("nennt nach Mitternacht den deutschen Tag, nicht den UTC-Vortag", () => {
    expect(formatMaintenanceUntil("2026-09-18T22:30:00.000Z")).toBe(
      "Samstag, 19. September 2026 um 00:30",
    );
  });

  it("gibt ohne oder mit unbrauchbarem Wert null zurück", () => {
    expect(formatMaintenanceUntil(null)).toBeNull();
    expect(formatMaintenanceUntil("")).toBeNull();
    expect(formatMaintenanceUntil("irgendwann")).toBeNull();
  });
});
