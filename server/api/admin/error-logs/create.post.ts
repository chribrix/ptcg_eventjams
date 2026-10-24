import { PrismaClient } from "@prisma/client";
import { resolveOptionalAuthUser } from "~/server/services/auth/authService";
import { safeClientDiagnosticCode, safeDiagnosticRecord } from "~/server/util/safeDiagnostics";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const prisma = new PrismaClient();

  try {
    const authenticatedUser = await resolveOptionalAuthUser(event);
    const diagnostic = safeDiagnosticRecord({
      errorType: safeClientDiagnosticCode(body?.errorType),
      userId: authenticatedUser?.id,
      method: event.method,
    });
    const errorLog = await prisma.errorLog.create({
      data: diagnostic,
    });

    return {
      success: true,
      id: errorLog.id,
    };
  } catch {
    console.error("[diagnostic] persistence_failed");
    return {
      success: false,
      error: "Failed to create error log",
    };
  } finally {
    await prisma.$disconnect();
  }
});
