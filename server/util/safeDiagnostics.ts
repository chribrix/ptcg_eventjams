type DiagnosticInput = {
  errorType: unknown;
  error?: unknown;
  userId?: string | null;
  targetUserId?: string | null;
  method?: unknown;
};

const SAFE_CODE = /^[a-zA-Z][a-zA-Z0-9_.-]{0,79}$/;
const SAFE_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const SAFE_IDENTIFIER = /^[a-zA-Z0-9_-]{1,80}$/;
const CLIENT_DIAGNOSTIC_CODES = new Set([
  "auth_handler_plugin_disabled",
  "registration_duplicate_email",
  "registration_check_failed",
  "registration_failed",
  "info_registration_success",
  "info_user_logout",
  "logout_error",
]);

export function safeDiagnosticCode(value: unknown, fallback = "unexpected_error") {
  return typeof value === "string" && SAFE_CODE.test(value) ? value : fallback;
}

export function safeClientDiagnosticCode(value: unknown) {
  return typeof value === "string" && CLIENT_DIAGNOSTIC_CODES.has(value)
    ? value
    : "client_diagnostic";
}

export function safeDiagnosticRecord(input: DiagnosticInput) {
  const errorType = safeDiagnosticCode(input.errorType);
  const candidateStatus =
    input.error && typeof input.error === "object" && "statusCode" in input.error
      ? (input.error as { statusCode?: unknown }).statusCode
      : undefined;
  const statusCode =
    typeof candidateStatus === "number" &&
    Number.isInteger(candidateStatus) &&
    candidateStatus >= 400 &&
    candidateStatus <= 599
      ? candidateStatus
      : undefined;
  const method =
    typeof input.method === "string" && SAFE_METHODS.has(input.method)
      ? input.method
      : undefined;
  const targetUserId =
    typeof input.targetUserId === "string" && SAFE_IDENTIFIER.test(input.targetUserId)
      ? input.targetUserId
      : undefined;

  return {
    errorType,
    errorMessage: `Diagnostic ${errorType}`,
    userId: input.userId || null,
    metadata: {
      ...(method ? { method } : {}),
      ...(statusCode ? { statusCode } : {}),
      ...(targetUserId ? { targetUserId } : {}),
    },
  };
}
