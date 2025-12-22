import { PrismaClient } from "@prisma/client";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const prisma = new PrismaClient();

  try {
    const {
      userId,
      userEmail,
      errorType,
      errorMessage,
      cookies,
      userAgent,
      url,
      stackTrace,
      metadata,
    } = body;

    // Get IP address from request
    const ipAddress = getRequestIP(event, { xForwardedFor: true });

    // Create error log
    const errorLog = await prisma.errorLog.create({
      data: {
        userId: userId || null,
        userEmail: userEmail || null,
        errorType,
        errorMessage,
        cookies: cookies || null,
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
