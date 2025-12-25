import { PrismaClient } from "@prisma/client";
import type { H3Event } from "h3";

const prisma = new PrismaClient();

interface ErrorLogData {
  errorType: string;
  errorMessage: string;
  userId?: string | null;
  userEmail?: string | null;
  url?: string;
  userAgent?: string;
  ipAddress?: string;
  metadata?: any;
  stackTrace?: string;
}

/**
 * Log errors to the database with comprehensive context
 * Use this in all API endpoints to ensure errors are captured
 */
export async function logError(
  event: H3Event,
  error: unknown,
  errorType: string,
  additionalMetadata?: any
): Promise<void> {
  try {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stackTrace = error instanceof Error ? error.stack : undefined;

    // Get request details
    const url = getRequestURL(event).toString();
    const userAgent = getHeader(event, "user-agent") || undefined;
    const ipAddress =
      getHeader(event, "x-forwarded-for") ||
      getHeader(event, "x-real-ip") ||
      event.node.req.socket.remoteAddress ||
      undefined;

    // Try to get user info from session
    let userId: string | undefined;
    let userEmail: string | undefined;

    try {
      const supabaseUser = await serverSupabaseUser(event);
      if (supabaseUser) {
        userId = supabaseUser.id;
        userEmail = supabaseUser.email;
      }
    } catch {
      // Silently fail if we can't get user info
    }

    // Combine metadata
    const metadata = {
      ...additionalMetadata,
      method: event.method,
      path: getRequestPath(event),
      query: getQuery(event),
    };

    // Create error log entry
    await prisma.errorLog.create({
      data: {
        errorType,
        errorMessage: errorMessage.slice(0, 1000), // Limit message length
        userId: userId || null,
        userEmail: userEmail || null,
        url: url.slice(0, 500),
        userAgent: userAgent?.slice(0, 500),
        ipAddress: ipAddress?.slice(0, 100),
        metadata: metadata as any,
        stackTrace: stackTrace?.slice(0, 5000),
      },
    });

    console.error(`[${errorType}]`, errorMessage, {
      userId,
      userEmail,
      url,
      metadata,
    });
  } catch (logError) {
    // If logging fails, at least console.error it
    console.error("Failed to log error to database:", logError);
    console.error("Original error:", error);
  }
}

/**
 * Wrapper for API endpoints to catch all errors
 */
export function withErrorLogging<T>(
  handler: (event: H3Event) => Promise<T>,
  errorType: string = "api_error"
) {
  return async (event: H3Event): Promise<T> => {
    try {
      return await handler(event);
    } catch (error) {
      await logError(event, error, errorType);
      throw error;
    }
  };
}

/**
 * Log validation errors specifically
 */
export async function logValidationError(
  event: H3Event,
  validationError: any,
  endpoint: string
): Promise<void> {
  await logError(event, validationError, `validation_error_${endpoint}`, {
    validationIssues: validationError.issues || validationError.errors,
  });
}

/**
 * Log database errors specifically
 */
export async function logDatabaseError(
  event: H3Event,
  dbError: unknown,
  operation: string
): Promise<void> {
  await logError(event, dbError, `database_error_${operation}`, {
    operation,
    prismaError:
      dbError && typeof dbError === "object" && "code" in dbError
        ? (dbError as any).code
        : undefined,
  });
}

/**
 * Log authentication errors
 */
export async function logAuthError(
  event: H3Event,
  authError: unknown,
  context: string
): Promise<void> {
  await logError(event, authError, `auth_error_${context}`, {
    context,
  });
}
