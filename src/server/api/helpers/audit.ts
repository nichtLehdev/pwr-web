import type { Prisma } from "~/generated/prisma/client";
import type { db as database } from "@/server/db";

import { createLogger } from "@/server/utils/logger";

const log = createLogger("Audit");

type Db = typeof database;

export type AuditEntry = {
  actorId?: string | null;
  actorEmail?: string | null;
  /** e.g. "role.assign", "registration.payment_status", "user.delete" */
  action: string;
  /** e.g. "user", "course", "registration", "role" */
  entityType: string;
  entityId?: string | null;
  /** Human-readable summary and/or structured before/after values. */
  details?: Prisma.InputJsonValue;
};

/**
 * Write an audit-log entry. Fire-and-forget by design: an audit failure must
 * never fail the audited mutation, so errors are logged and swallowed.
 * Call without await (`void logAudit(...)`) unless ordering matters.
 */
export async function logAudit(db: Db, entry: AuditEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        actorEmail: entry.actorEmail ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        details: entry.details,
      },
    });
  } catch (error) {
    log.error(`Failed to write audit log (${entry.action}):`, error);
  }
}
