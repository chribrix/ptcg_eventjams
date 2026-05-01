import prisma from "~/lib/prisma";

type AdminActionLogInput = {
  actorUserId: string;
  targetUserId?: string | null;
  actionType: string;
  metadata?: Record<string, unknown>;
};

export async function logAdminAction(input: AdminActionLogInput) {
  try {
    await prisma.errorLog.create({
      data: {
        userId: input.actorUserId,
        errorType: input.actionType,
        errorMessage: `Admin action: ${input.actionType}`,
        metadata: {
          targetUserId: input.targetUserId || null,
          ...(input.metadata || {}),
        },
      },
    });
  } catch (error) {
    console.error("Failed to write admin action log:", error);
  }
}
