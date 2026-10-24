import prisma from "~/lib/prisma";
import { safeDiagnosticRecord } from "~/server/util/safeDiagnostics";

type AdminActionLogInput = {
  actorUserId: string;
  targetUserId?: string | null;
  actionType: string;
  metadata?: Record<string, unknown>;
};

export async function logAdminAction(input: AdminActionLogInput) {
  try {
    await prisma.errorLog.create({
      data: safeDiagnosticRecord({ errorType: input.actionType, userId: input.actorUserId, targetUserId: input.targetUserId }),
    });
  } catch {
    console.error("[diagnostic] admin_audit_persistence_failed");
  }
}
