import { describe, expect, it } from "@jest/globals";
import {
  MAINTENANCE_PATH,
  isInfrastructurePath,
  isMaintenanceAllowedPath,
} from "../maintenance";

/**
 * Diese beiden Funktionen entscheiden, was im Wartungsmodus erreichbar bleibt.
 * Ein Fehler nach der einen Seite sperrt die Redaktion aus ihrem eigenen
 * Dashboard aus, nach der anderen bleibt die Seite offen, die zu sein sollte.
 */
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
    // "/loginentwurf" ist keine Unterseite von "/login" und darf nicht
    // versehentlich freigegeben werden.
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
    // Kein Präfix-Treffer auf einer echten Seite, die so anfängt.
    expect(isInfrastructurePath("/sitemap-hinweise")).toBe(false);
  });
});
