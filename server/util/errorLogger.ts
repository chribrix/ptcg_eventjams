import { PrismaClient } from "@prisma/client";
import type { H3Event } from "h3";
import { resolveOptionalAuthUser } from "~/server/services/auth/authService";
import { safeDiagnosticRecord } from "~/server/util/safeDiagnostics";

const prisma = new PrismaClient();

/** Persist only allowlisted diagnostics. Errors, URLs, queries and headers may contain secrets. */
export async function logError(
  event: H3Event,
  error: unknown,
  errorType: string,
  _additionalMetadata?: unknown,
): Promise<void> {
  try {
    let userId: string | null = null;
    try {
      userId = (await resolveOptionalAuthUser(event))?.id || null;
    } catch {
      // Diagnostics must not depend on a valid session.
    }

    const diagnostic = safeDiagnosticRecord({
      errorType,
      error,
      userId,
      method: event.method,
    });
    await prisma.errorLog.create({ data: diagnostic });
    console.error("[diagnostic]", diagnostic.errorType, diagnostic.metadata);
  } catch {
    console.error("[diagnostic] persistence_failed");
  }
}

export function withErrorLogging<T>(
  handler: (event: H3Event) => Promise<T>,
  errorType = "api_error",
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

export async function logValidationError(
  event: H3Event,
  validationError: unknown,
  endpoint: string,
): Promise<void> {
  await logError(event, validationError, `validation_error_${endpoint}`);
}

export async function logDatabaseError(
  event: H3Event,
  dbError: unknown,
  operation: string,
  _additionalMetadata?: unknown,
): Promise<void> {
  await logError(event, dbError, `database_error_${operation}`);
}

export async function logAuthError(
  event: H3Event,
  authError: unknown,
  context: string,
): Promise<void> {
  await logError(event, authError, `auth_error_${context}`);
}
