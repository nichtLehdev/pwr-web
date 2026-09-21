import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { logAudit } from "@/server/api/helpers/audit";
import { createLogger } from "@/server/utils/logger";

const log = createLogger("Cron");

/**
 * Nie bestätigte Konten sind kein Konto, sondern ein ungenutzter Datensatz
 * (Art. 5 Abs. 1 lit. e DSGVO). Sie blockieren außerdem die Adresse: Wer sich
 * unter einer von einem Bot registrierten Adresse anmelden will, bekommt sonst
 * dauerhaft „bereits registriert". Der Bestätigungslink gilt 24 Stunden, 14
 * Tage sind reichlich Abstand.
 */
const UNVERIFIED_MAX_AGE_DAYS = 14;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

/**
 * Löscht selbst angelegte, nie bestätigte Konten. Auf mittwald per
 * mStudio-Cronjob (scripts/trigger-user-cleanup.mjs), Bearer <CRON_SECRET>.
 */
export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(
    Date.now() - UNVERIFIED_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
  );

  try {
    const abandoned = await db.user.findMany({
      where: {
        OR: [{ emailVerified: false }, { emailVerified: null }],
        createdAt: { lt: cutoff },
        lastLoginAt: null,
        sessions: { none: {} },
        // Nur Selbstregistrierungen: Konten, die das Team von Hand anlegt,
        // haben kein Passwort und damit keinen Account-Datensatz. Sie warten
        // oft länger auf die erste Anmeldung und dürfen nicht verschwinden.
        accounts: { some: { providerId: "credential" } },
        // Alles, was jemand von Hand mit dem Konto verbunden hat, schützt es —
        // dann steckt eine Absicht dahinter, kein liegengebliebenes Formular.
        teamMember: { is: null },
        vorstandMember: { is: null },
        posaunenratMember: { is: null },
        foerdervereinMember: { is: null },
        posaunenwart: { is: null },
        bezirkPersons: { none: {} },
        customRoles: { none: {} },
        userPermissions: { none: {} },
        courseRegistrations: { none: {} },
        createdEvents: { none: {} },
        createdCourses: { none: {} },
        createdPosts: { none: {} },
        authoredPosts: { none: {} },
      },
      select: { id: true, email: true },
    });

    if (abandoned.length === 0) {
      return NextResponse.json({
        deleted: 0,
        olderThanDays: UNVERIFIED_MAX_AGE_DAYS,
        cutoff: cutoff.toISOString(),
      });
    }

    const [, deleted] = await db.$transaction([
      // Verification-Zeilen hängen an der Adresse, nicht am Konto — ohne diesen
      // Schritt blieben die Bestätigungstoken der gelöschten Konten liegen.
      db.verification.deleteMany({
        where: { identifier: { in: abandoned.map((user) => user.email) } },
      }),
      db.user.deleteMany({
        where: { id: { in: abandoned.map((user) => user.id) } },
      }),
    ]);

    log.info(
      `User cleanup removed ${deleted.count} unverified account(s) older than ${UNVERIFIED_MAX_AGE_DAYS} days`,
    );

    // Nur die Zahl: Die Adressen der gelöschten Konten im Protokoll
    // aufzubewahren wäre das Gegenteil des Löschens.
    void logAudit(db, {
      action: "user.cleanup_unverified",
      entityType: "user",
      details: {
        deleted: deleted.count,
        olderThanDays: UNVERIFIED_MAX_AGE_DAYS,
      },
    });

    return NextResponse.json({
      deleted: deleted.count,
      olderThanDays: UNVERIFIED_MAX_AGE_DAYS,
      cutoff: cutoff.toISOString(),
    });
  } catch (error) {
    log.error("User cleanup failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}

/** Allow GET for simple cron services that only support GET. */
export async function GET(request: NextRequest) {
  return POST(request);
}
