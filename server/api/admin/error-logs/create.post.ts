import { PrismaClient } from "@prisma/client";
import { resolveOptionalAuthUser } from "~/server/services/auth/authService";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const prisma = new PrismaClient();

  try {
    const {
      errorType,
      errorMessage,
      userAgent,
      url,
      stackTrace,
      metadata,
    } = body;

    const authenticatedUser = await resolveOptionalAuthUser(event);

    // Get IP address from request
    const ipAddress = getRequestIP(event, { xForwardedFor: true });

    // Create error log
    const errorLog = await prisma.errorLog.create({
      data: {
        // Do not trust identity or cookie data supplied by a browser log call.
        userId: authenticatedUser?.id || null,
        userEmail: authenticatedUser?.email || null,
        errorType,
        errorMessage,
        // Authentication material must never be persisted in diagnostics.
        cookies: null,
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
        url: url || null,
        stackTrace: stackTrace || null,
        metadata: metadata || null,
      },
    });

    return {
      success: true,
      id: errorLog.id,
    };
  } catch (error) {
    console.error("Failed to create error log:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    await prisma.$disconnect();
  }
});
