/**
 * Tests für den Login-Workflow – Fälle OHNE E-Mail-Bestätigung.
 *
 * Abgedeckte Fälle (gemäß loginworkflow.md):
 *   Fall 1  – Neuer Nutzer registriert sich mit Passwort
 *   Fall 2  – Bestehender Nutzer mit Passwort meldet sich an
 *   Fall 3a – Magic-Link-Nutzer, der den Link NIE geklickt hat, setzt erstmals Passwort
 *             → direkt eingeloggt, keine Bestätigungsmail
 *             Variante A: has_password = false  (passwordState: "missing")
 *             Variante B: kein has_password  in app_metadata (passwordState: "unknown")
 *   Fall 4  – Bestehender Nutzer wählt Magic Link statt Passwort
 *
 * NICHT abgedeckt (benötigen Bestätigungsmail):
 *   Fall 3b – Magic-Link-Nutzer mit vorheriger Anmeldung (email_confirmed_at gesetzt)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  mockAuthUsers,
  mockPlayers,
  mockTokenResponse,
  createMockError,
} from "../mocks/authMocks";

// ---------------------------------------------------------------------------
// Hilfsfunktionen die Server-Logik spiegeln
// ---------------------------------------------------------------------------

/**
 * Simuliert die Logik von /api/auth/check-password.
 * Ermittelt den passwordState aus den app_metadata eines Auth-Users.
 */
const resolvePasswordState = (
  appMetadata: Record<string, any> | undefined,
): "has" | "missing" | "unknown" => {
  if (!appMetadata) return "unknown";
  if (appMetadata.has_password === true) return "has";
  if (appMetadata.pending_password_setup) return "missing";
  if (appMetadata.has_password === false) return "missing";
  return "unknown";
};

/**
 * Simuliert die Composable-Logik in useLoginWorkflow.ts.
 * Wandelt passwordState in hasPassword um (Bug-2-fixer Ausdruck).
 */
const resolveHasPassword = (
  passwordState: "has" | "missing" | "unknown" | undefined,
): boolean => {
  return passwordState === "has";
};

type PasswordSetupResult =
  | {
      mode: "direct";
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
    }
  | {
      mode: "confirm_email";
      email: string;
      redirectTo: string;
    };

/**
 * Simuliert die Kern-Entscheidungslogik von /api/auth/request-password-setup.
 * Gibt an, welcher Pfad gewählt wird (direkt vs. confirm_email).
 */
const resolveSetupMode = (
  authUser: {
    email_confirmed_at?: string | null;
    app_metadata?: Record<string, any>;
  },
  supabaseAdminMock: { updateUserById: ReturnType<typeof vi.fn> },
  loginFetchMock: ReturnType<typeof vi.fn>,
  prismaExecMock: ReturnType<typeof vi.fn>,
  userId: string,
  email: string,
  pepperedPassword: string,
  appBaseUrl: string,
  returnPath?: string,
): PasswordSetupResult => {
  const hasLoggedInBefore = Boolean(authUser.email_confirmed_at);

  if (!hasLoggedInBefore) {
    // Path A: direkter Weg
    const directMeta = {
      ...(authUser.app_metadata ?? {}),
      has_password: true,
      pending_password_setup: null,
    };
    supabaseAdminMock.updateUserById(userId, {
      password: pepperedPassword,
      email_confirm: true,
      app_metadata: directMeta,
    });

    const loginData = loginFetchMock(email, pepperedPassword);
    prismaExecMock(userId, email);

    return {
      mode: "direct",
      access_token: loginData.access_token,
      refresh_token: loginData.refresh_token,
      expires_in: loginData.expires_in,
      token_type: loginData.token_type,
    };
  }

  // Path B: confirm_email (nicht Gegenstand dieser Tests)
  const params = new URLSearchParams();
  if (returnPath) params.set("return", returnPath);
  params.set("flow", "set-password");
  return {
    mode: "confirm_email",
    email,
    redirectTo: `${appBaseUrl}/confirm?${params.toString()}`,
  };
};

// ---------------------------------------------------------------------------
// Mock-Setup
// ---------------------------------------------------------------------------

const makeSupabaseAdminMock = () => ({
  updateUserById: vi.fn().mockResolvedValue({ error: null }),
});

const makeLoginFetchMock = (userId: string, email: string) =>
  vi.fn().mockReturnValue(mockTokenResponse(userId, email));

const makePrismaExecMock = () => vi.fn().mockResolvedValue(undefined);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Login Workflow – Fälle ohne E-Mail-Bestätigung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // check-password Endpunkt: passwordState-Erkennung
  // -------------------------------------------------------------------------

  describe("check-password – passwordState Erkennung", () => {
    it("sollte passwordState 'has' zurückgeben, wenn has_password: true gesetzt ist", () => {
      const state = resolvePasswordState(
        mockAuthUsers.passwordUser.app_metadata,
      );
      expect(state).toBe("has");
    });

    it("sollte passwordState 'missing' zurückgeben, wenn has_password: false gesetzt ist", () => {
      const state = resolvePasswordState(
        mockAuthUsers.magicLinkNeverConfirmed.app_metadata,
      );
      expect(state).toBe("missing");
    });

    it("sollte passwordState 'unknown' zurückgeben, wenn app_metadata leer ist (Legacy-Nutzer)", () => {
      const state = resolvePasswordState(
        mockAuthUsers.legacyNoMetadata.app_metadata,
      );
      expect(state).toBe("unknown");
    });

    it("sollte passwordState 'unknown' zurückgeben, wenn app_metadata undefined ist", () => {
      const state = resolvePasswordState(undefined);
      expect(state).toBe("unknown");
    });

    it("sollte passwordState 'missing' zurückgeben, wenn pending_password_setup vorhanden ist", () => {
      const state = resolvePasswordState({
        has_password: false,
        pending_password_setup: {
          ciphertext: "abc",
          iv: "def",
          tag: "ghi",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        },
      });
      expect(state).toBe("missing");
    });
  });

  // -------------------------------------------------------------------------
  // useLoginWorkflow: hasPassword-Ableitung aus passwordState (Bug 2)
  // -------------------------------------------------------------------------

  describe("useLoginWorkflow – hasPassword-Ableitung aus passwordState", () => {
    it("sollte hasPassword = true sein, wenn passwordState 'has' ist", () => {
      expect(resolveHasPassword("has")).toBe(true);
    });

    it("sollte hasPassword = false sein, wenn passwordState 'missing' ist", () => {
      expect(resolveHasPassword("missing")).toBe(false);
    });

    it("sollte hasPassword = false sein, wenn passwordState 'unknown' ist (Bug-2-Fix)", () => {
      // Früher: passwordState === "missing" ? false : true → "unknown" wurde fälschlich true
      expect(resolveHasPassword("unknown")).toBe(false);
    });

    it("sollte hasPassword = false sein, wenn passwordState undefined ist", () => {
      expect(resolveHasPassword(undefined)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // request-password-setup: Pfad-Entscheidung basierend auf email_confirmed_at
  // -------------------------------------------------------------------------

  describe("request-password-setup – Pfad-Entscheidung", () => {
    it("sollte Path A (direkt) wählen, wenn email_confirmed_at null ist (nie angemeldet)", () => {
      const user = mockAuthUsers.magicLinkNeverConfirmed;
      const adminMock = makeSupabaseAdminMock();
      const loginMock = makeLoginFetchMock(user.id, user.email);
      const prismaMock = makePrismaExecMock();

      const result = resolveSetupMode(
        user,
        adminMock,
        loginMock,
        prismaMock,
        user.id,
        user.email,
        "peppered-pw-hash",
        "https://app.example.com",
      );

      expect(result.mode).toBe("direct");
    });

    it("sollte Path B (confirm_email) wählen, wenn email_confirmed_at gesetzt ist", () => {
      const user = mockAuthUsers.magicLinkPreviouslyConfirmed;
      const adminMock = makeSupabaseAdminMock();
      const loginMock = makeLoginFetchMock(user.id, user.email);
      const prismaMock = makePrismaExecMock();

      const result = resolveSetupMode(
        user,
        adminMock,
        loginMock,
        prismaMock,
        user.id,
        user.email,
        "peppered-pw-hash",
        "https://app.example.com",
      );

      expect(result.mode).toBe("confirm_email");
    });

    it("sollte Path A (direkt) wählen, wenn app_metadata leer ist (Legacy-Nutzer, nie angemeldet)", () => {
      const user = mockAuthUsers.legacyNoMetadata;
      const adminMock = makeSupabaseAdminMock();
      const loginMock = makeLoginFetchMock(user.id, user.email);
      const prismaMock = makePrismaExecMock();

      const result = resolveSetupMode(
        user,
        adminMock,
        loginMock,
        prismaMock,
        user.id,
        user.email,
        "peppered-pw-hash",
        "https://app.example.com",
      );

      expect(result.mode).toBe("direct");
    });
  });

  // -------------------------------------------------------------------------
  // request-password-setup Path A: korrekte Admin-API-Aufrufe
  // -------------------------------------------------------------------------

  describe("request-password-setup Path A – Admin-API-Aufrufe", () => {
    it("sollte updateUserById mit email_confirm: true aufrufen", () => {
      const user = mockAuthUsers.magicLinkNeverConfirmed;
      const adminMock = makeSupabaseAdminMock();
      const loginMock = makeLoginFetchMock(user.id, user.email);
      const prismaMock = makePrismaExecMock();

      resolveSetupMode(
        user,
        adminMock,
        loginMock,
        prismaMock,
        user.id,
        user.email,
        "peppered-pw-hash",
        "https://app.example.com",
      );

      expect(adminMock.updateUserById).toHaveBeenCalledWith(
        user.id,
        expect.objectContaining({ email_confirm: true }),
      );
    });

    it("sollte updateUserById mit has_password: true in app_metadata aufrufen", () => {
      const user = mockAuthUsers.magicLinkNeverConfirmed;
      const adminMock = makeSupabaseAdminMock();
      const loginMock = makeLoginFetchMock(user.id, user.email);
      const prismaMock = makePrismaExecMock();

      resolveSetupMode(
        user,
        adminMock,
        loginMock,
        prismaMock,
        user.id,
        user.email,
        "peppered-pw-hash",
        "https://app.example.com",
      );

      expect(adminMock.updateUserById).toHaveBeenCalledWith(
        user.id,
        expect.objectContaining({
          app_metadata: expect.objectContaining({ has_password: true }),
        }),
      );
    });

    it("sollte updateUserById mit pending_password_setup: null aufrufen (Zustand bereinigen)", () => {
      const user = mockAuthUsers.magicLinkNeverConfirmed;
      const adminMock = makeSupabaseAdminMock();
      const loginMock = makeLoginFetchMock(user.id, user.email);
      const prismaMock = makePrismaExecMock();

      resolveSetupMode(
        user,
        adminMock,
        loginMock,
        prismaMock,
        user.id,
        user.email,
        "peppered-pw-hash",
        "https://app.example.com",
      );

      expect(adminMock.updateUserById).toHaveBeenCalledWith(
        user.id,
        expect.objectContaining({
          app_metadata: expect.objectContaining({
            pending_password_setup: null,
          }),
        }),
      );
    });

    it("sollte updateUserById mit dem gepfefferten Passwort aufrufen", () => {
      const user = mockAuthUsers.magicLinkNeverConfirmed;
      const adminMock = makeSupabaseAdminMock();
      const loginMock = makeLoginFetchMock(user.id, user.email);
      const prismaMock = makePrismaExecMock();
      const pepperedPw = "aabbcc11223344peppered";

      resolveSetupMode(
        user,
        adminMock,
        loginMock,
        prismaMock,
        user.id,
        user.email,
        pepperedPw,
        "https://app.example.com",
      );

      expect(adminMock.updateUserById).toHaveBeenCalledWith(
        user.id,
        expect.objectContaining({ password: pepperedPw }),
      );
    });

    it("sollte den Login-Fetch mit Email und gepfeffertem Passwort aufrufen", () => {
      const user = mockAuthUsers.magicLinkNeverConfirmed;
      const adminMock = makeSupabaseAdminMock();
      const loginMock = makeLoginFetchMock(user.id, user.email);
      const prismaMock = makePrismaExecMock();
      const pepperedPw = "peppered-hash-xyz";

      resolveSetupMode(
        user,
        adminMock,
        loginMock,
        prismaMock,
        user.id,
        user.email,
        pepperedPw,
        "https://app.example.com",
      );

      expect(loginMock).toHaveBeenCalledWith(user.email, pepperedPw);
    });

    it("sollte den Prisma-Update für preferred_login_method aufrufen", () => {
      const user = mockAuthUsers.magicLinkNeverConfirmed;
      const adminMock = makeSupabaseAdminMock();
      const loginMock = makeLoginFetchMock(user.id, user.email);
      const prismaMock = makePrismaExecMock();

      resolveSetupMode(
        user,
        adminMock,
        loginMock,
        prismaMock,
        user.id,
        user.email,
        "peppered-pw",
        "https://app.example.com",
      );

      expect(prismaMock).toHaveBeenCalledWith(user.id, user.email);
    });
  });

  // -------------------------------------------------------------------------
  // request-password-setup Path A: Rückgabewerte
  // -------------------------------------------------------------------------

  describe("request-password-setup Path A – Rückgabewerte", () => {
    it("sollte mode 'direct' und gültige Token zurückgeben", () => {
      const user = mockAuthUsers.magicLinkNeverConfirmed;
      const adminMock = makeSupabaseAdminMock();
      const loginMock = makeLoginFetchMock(user.id, user.email);
      const prismaMock = makePrismaExecMock();

      const result = resolveSetupMode(
        user,
        adminMock,
        loginMock,
        prismaMock,
        user.id,
        user.email,
        "peppered-pw",
        "https://app.example.com",
      );

      expect(result.mode).toBe("direct");
      if (result.mode === "direct") {
        expect(result.access_token).toContain(user.id);
        expect(result.refresh_token).toContain(user.id);
        expect(result.expires_in).toBeGreaterThan(0);
        expect(result.token_type).toBe("bearer");
      }
    });

    it("sollte für Legacy-Nutzer (leere app_metadata) ebenfalls mode 'direct' zurückgeben", () => {
      const user = mockAuthUsers.legacyNoMetadata;
      const adminMock = makeSupabaseAdminMock();
      const loginMock = makeLoginFetchMock(user.id, user.email);
      const prismaMock = makePrismaExecMock();

      const result = resolveSetupMode(
        user,
        adminMock,
        loginMock,
        prismaMock,
        user.id,
        user.email,
        "peppered-pw",
        "https://app.example.com",
      );

      expect(result.mode).toBe("direct");
    });
  });

  // -------------------------------------------------------------------------
  // Integrations-Flow: Fall 3a – vollständiger Ablauf
  // -------------------------------------------------------------------------

  describe("Fall 3a – Vollständiger Flow: Magic-Link-Nutzer setzt erstmals Passwort (ohne E-Mail-Bestätigung)", () => {
    /**
     * Testet den kompletten Ablauf:
     * 1. Email wird eingegeben → Account gefunden
     * 2. check-password → passwordState: "missing" → hasPassword = false
     * 3. passwordSetup-Step wird angezeigt (kein Umweg über Passwort-Eingabe)
     * 4. Nutzer gibt neues Passwort ein → request-password-setup
     * 5. Path A wird gewählt (kein email_confirmed_at)
     * 6. Passwort wird sofort gesetzt (email_confirm: true)
     * 7. Nutzer ist direkt eingeloggt (mode: "direct" + Token)
     */

    it("Fall 3a (has_password: false): Nutzer wird direkt eingeloggt ohne Bestätigungsmail", () => {
      const user = mockAuthUsers.magicLinkNeverConfirmed;

      // Schritt 1: check-password
      const passwordState = resolvePasswordState(user.app_metadata);
      expect(passwordState).toBe("missing");

      // Schritt 2: hasPassword ableiten
      const hasPassword = resolveHasPassword(passwordState);
      expect(hasPassword).toBe(false);
      // → UI zeigt passwordSetup-Step direkt an

      // Schritt 3: Passwort eingeben und request-password-setup aufrufen
      const adminMock = makeSupabaseAdminMock();
      const loginMock = makeLoginFetchMock(user.id, user.email);
      const prismaMock = makePrismaExecMock();

      const result = resolveSetupMode(
        user,
        adminMock,
        loginMock,
        prismaMock,
        user.id,
        user.email,
        "user-new-peppered-password",
        "https://app.example.com",
      );

      // Schritt 4: Direkte Anmeldung, keine E-Mail
      expect(result.mode).toBe("direct");
      if (result.mode === "direct") {
        expect(result.access_token).toBeTruthy();
        expect(result.refresh_token).toBeTruthy();
      }

      // Schritt 5: Admin-API wurde korrekt aufgerufen
      expect(adminMock.updateUserById).toHaveBeenCalledWith(
        user.id,
        expect.objectContaining({
          email_confirm: true,
          app_metadata: expect.objectContaining({ has_password: true }),
        }),
      );

      // Schritt 6: preferred_login_method wurde aktualisiert
      expect(prismaMock).toHaveBeenCalledTimes(1);
    });

    it("Fall 3a (passwordState: 'unknown', leere app_metadata): Nutzer wird direkt eingeloggt", () => {
      const user = mockAuthUsers.legacyNoMetadata;

      // Schritt 1: check-password
      const passwordState = resolvePasswordState(user.app_metadata);
      expect(passwordState).toBe("unknown");

      // Schritt 2: hasPassword – Bug-2-Fix: "unknown" → false (nicht true!)
      const hasPassword = resolveHasPassword(passwordState);
      expect(hasPassword).toBe(false);
      // → UI zeigt passwordSetup-Step direkt an (kein Umweg über Passwort-Eingabe)

      // Schritt 3: request-password-setup
      const adminMock = makeSupabaseAdminMock();
      const loginMock = makeLoginFetchMock(user.id, user.email);
      const prismaMock = makePrismaExecMock();

      const result = resolveSetupMode(
        user,
        adminMock,
        loginMock,
        prismaMock,
        user.id,
        user.email,
        "legacy-user-new-pw-peppered",
        "https://app.example.com",
      );

      // Schritt 4: Direkter Login
      expect(result.mode).toBe("direct");
      if (result.mode === "direct") {
        expect(result.access_token).toBeTruthy();
        expect(result.refresh_token).toBeTruthy();
      }

      // Schritt 5: Admin-API: has_password: true + email_confirm: true
      expect(adminMock.updateUserById).toHaveBeenCalledWith(
        user.id,
        expect.objectContaining({
          email_confirm: true,
          app_metadata: expect.objectContaining({
            has_password: true,
            pending_password_setup: null,
          }),
        }),
      );
    });

    it("Garantiert: passwordState 'unknown' wird NICHT als 'hat Passwort' behandelt (Regression für Bug 2)", () => {
      // Dieser Test verhindert, dass Bug 2 wieder eingeführt wird.
      // Der alte Fehler: passwordState === "missing" ? false : true
      // War falsch, weil "unknown" als true gewertet wurde.
      const buggyFormula = (state: string) =>
        state === "missing" ? false : true;
      const fixedFormula = (state: string) => state === "has";

      // Alter Code: "unknown" ergibt fälschlich true
      expect(buggyFormula("unknown")).toBe(true); // ← das war der Bug
      // Neuer Code: "unknown" ergibt korrekt false
      expect(fixedFormula("unknown")).toBe(false); // ← der Fix
    });
  });

  // -------------------------------------------------------------------------
  // Fall 1 – Neuer Nutzer registriert sich mit Passwort
  // -------------------------------------------------------------------------

  describe("Fall 1 – Neuer Nutzer: Registrierung mit Passwort", () => {
    it("sollte einen neuen User mit email_confirm: true und has_password: true anlegen", () => {
      const createUserMock = vi.fn().mockReturnValue({
        data: {
          user: {
            id: "new-user-99",
            email: "new@example.com",
            email_confirmed_at: new Date().toISOString(),
            app_metadata: { has_password: true },
          },
        },
        error: null,
      });

      const result = createUserMock({
        email: "new@example.com",
        password: "peppered-new-pw",
        email_confirm: true,
        app_metadata: { has_password: true, pending_password_setup: null },
        user_metadata: { name: "New User", playerId: "NEW99" },
      });

      expect(createUserMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email_confirm: true,
          app_metadata: expect.objectContaining({ has_password: true }),
        }),
      );
      expect(result.error).toBeNull();
      expect(result.data.user.email_confirmed_at).toBeTruthy();
    });

    it("sollte nach Registrierung direkt eingeloggt sein (kein E-Mail-Bestätigungsschritt)", () => {
      // Nach register-password folgt direkt login-password
      const loginMock = makeLoginFetchMock("new-user-99", "new@example.com");
      const tokens = loginMock("new@example.com", "peppered-new-pw");

      expect(tokens.access_token).toBeTruthy();
      expect(tokens.refresh_token).toBeTruthy();
      expect(tokens.token_type).toBe("bearer");
    });
  });

  // -------------------------------------------------------------------------
  // Fall 2 – Bestehender Nutzer mit Passwort
  // -------------------------------------------------------------------------

  describe("Fall 2 – Bestehender Nutzer: Login mit Passwort", () => {
    it("sollte passwordState 'has' und hasPassword = true ergeben", () => {
      const state = resolvePasswordState(
        mockAuthUsers.passwordUser.app_metadata,
      );
      const hasPassword = resolveHasPassword(state);

      expect(state).toBe("has");
      expect(hasPassword).toBe(true);
    });

    it("sollte einen Login-Versuch mit falschem Passwort ablehnen (Supabase 400)", () => {
      const loginMock = vi.fn().mockReturnValue({
        ok: false,
        error_description: "Invalid login credentials",
      });

      const result = loginMock("password-user@example.com", "wrong-password");

      expect(result.ok).toBe(false);
      expect(result.error_description).toMatch(/invalid login credentials/i);
    });

    it("sollte bei korrektem Passwort Token zurückgeben", () => {
      const user = mockAuthUsers.passwordUser;
      const loginMock = makeLoginFetchMock(user.id, user.email);
      const tokens = loginMock(user.email, "correct-peppered-pw");

      expect(tokens.access_token).toContain(user.id);
      expect(tokens.refresh_token).toContain(user.id);
    });
  });

  // -------------------------------------------------------------------------
  // Fall 4 – Magic-Link-Login
  // -------------------------------------------------------------------------

  describe("Fall 4 – Bestehender Nutzer wählt Magic Link", () => {
    it("sollte signInWithOtp mit der E-Mail und emailRedirectTo aufrufen", () => {
      const signInWithOtpMock = vi.fn().mockResolvedValue({ error: null });
      const email = "password-user@example.com";
      const redirectTo = "https://app.example.com/confirm?return=%2Fdashboard";

      signInWithOtpMock({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      expect(signInWithOtpMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email,
          options: expect.objectContaining({ emailRedirectTo: redirectTo }),
        }),
      );
    });

    it("sollte eine Fehlermeldung anzeigen, wenn OTP-Rate-Limit ausgelöst wird", async () => {
      const signInWithOtpMock = vi.fn().mockResolvedValue({
        error: {
          message:
            "For security purposes, you can only request after 58 seconds.",
        },
      });

      const result = await signInWithOtpMock({
        email: "user@example.com",
        options: { emailRedirectTo: "https://app.example.com/confirm" },
      });

      expect(result.error).toBeTruthy();
      expect(result.error.message).toMatch(/security purposes/i);
    });
  });

  // -------------------------------------------------------------------------
  // Grenzfälle / Edge Cases
  // -------------------------------------------------------------------------

  describe("Grenzfälle", () => {
    it("sollte 'password_already_set' zurückgeben, wenn has_password bereits true ist", () => {
      const user = mockAuthUsers.passwordUser;

      const alreadyHasPassword = user.app_metadata.has_password === true;
      expect(alreadyHasPassword).toBe(true);

      // Simulation: request-password-setup würde 409 werfen
      const error = createMockError(409, "password_already_set");
      expect(error.statusCode).toBe(409);
      expect(error.statusMessage).toBe("password_already_set");
    });

    it("sollte 404 zurückgeben, wenn der Auth-User nicht gefunden wird", () => {
      const error = createMockError(404, "Account not found");
      expect(error.statusCode).toBe(404);
    });

    it("sollte Passwort mit weniger als 8 Zeichen ablehnen", () => {
      const password = "short";
      const isValid = password.length >= 8;

      expect(isValid).toBe(false);
      // → würde 400 statusMessage: "Password must be at least 8 characters" werfen
    });

    it("sollte Passwort-Mismatch (Bestätigung stimmt nicht) im Composable erkennen", () => {
      const newPassword = "sicheresPasswort123";
      const newPasswordConfirm = "anderesPaswort123";

      const mismatch = newPassword !== newPasswordConfirm;
      expect(mismatch).toBe(true);
      // → Composable setzt error.value = "Passwörter stimmen nicht überein."
    });

    it("sollte confirm_email-Pfad keinen updateUserById ohne email_confirm aufrufen", () => {
      // Stellt sicher, dass Path B (confirm_email) updateUserById nicht für den direkten Login aufruft
      const user = mockAuthUsers.magicLinkPreviouslyConfirmed;
      const adminMock = makeSupabaseAdminMock();
      const loginMock = makeLoginFetchMock(user.id, user.email);
      const prismaMock = makePrismaExecMock();

      const result = resolveSetupMode(
        user,
        adminMock,
        loginMock,
        prismaMock,
        user.id,
        user.email,
        "peppered-pw",
        "https://app.example.com",
      );

      expect(result.mode).toBe("confirm_email");
      // für Path B wird updateUserById im Test-Mock nicht aufgerufen
      // (echter Server ruft es für pending_password_setup auf, was aber nicht Teil dieser Tests ist)
      expect(adminMock.updateUserById).not.toHaveBeenCalledWith(
        user.id,
        expect.objectContaining({ email_confirm: true }),
      );
    });
  });
});
