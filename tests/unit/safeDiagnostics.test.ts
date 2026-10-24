import { describe, expect, it } from "vitest";
import { safeClientDiagnosticCode, safeDiagnosticRecord } from "~/server/util/safeDiagnostics";

describe("safe diagnostics", () => {
  it("drops secret-bearing errors, URLs, cookies and caller metadata", () => {
    const secret = "secret-refresh-token";
    const record = safeDiagnosticRecord({
      errorType: `auth?token=${secret}`,
      error: Object.assign(new Error(`cookie=${secret}`), { statusCode: 401 }),
      userId: "safe-user-id",
      method: "POST",
    });

    expect(record).toEqual({
      errorType: "unexpected_error",
      errorMessage: "Diagnostic unexpected_error",
      userId: "safe-user-id",
      metadata: { method: "POST", statusCode: 401 },
    });
    expect(JSON.stringify(record)).not.toContain(secret);
  });

  it("keeps stable diagnostic codes while rejecting untrusted methods", () => {
    expect(
      safeDiagnosticRecord({ errorType: "database_error_booking", method: "POST /?token=secret" }),
    ).toEqual({
      errorType: "database_error_booking",
      errorMessage: "Diagnostic database_error_booking",
      userId: null,
      metadata: {},
    });
  });

  it("accepts only known browser diagnostic categories", () => {
    expect(safeClientDiagnosticCode("registration_failed")).toBe("registration_failed");
    expect(safeClientDiagnosticCode("mySecretPassword123")).toBe("client_diagnostic");
  });

  it("keeps a safe audit target identifier without accepting arbitrary metadata", () => {
    expect(safeDiagnosticRecord({ errorType: "admin_role_granted", targetUserId: "user-123" }).metadata)
      .toEqual({ targetUserId: "user-123" });
    expect(safeDiagnosticRecord({ errorType: "admin_role_granted", targetUserId: "token=secret" }).metadata)
      .toEqual({});
  });
});
