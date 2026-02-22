/**
 * Mock data for authentication / login workflow tests.
 *
 * Nutzer-Typen nach Login-Workflow:
 *  - newUser:            Frisch registriert mit Passwort (email_confirm: true durch Admin-API)
 *  - passwordUser:       Bestehender Nutzer mit gesetztem Passwort
 *  - magicLinkUnconfirmed: Magic-Link-Nutzer, KEIN email_confirmed_at (nie den Link geklickt)
 *  - magicLinkConfirmed:   Magic-Link-Nutzer, email_confirmed_at gesetzt (mind. 1× angemeldet)
 *  - legacyNoMetadata:   Alter Nutzer ohne app_metadata.has_password (unknown-State)
 */

// ---------------------------------------------------------------------------
// Supabase Auth Users (wie sie aus der Admin-API kommen)
// ---------------------------------------------------------------------------

export const mockAuthUsers = {
  /** Fall 1 / Fall 2 – normaler Passwort-Nutzer */
  passwordUser: {
    id: "aaaaaaaa-0000-0000-0000-000000000001",
    email: "password-user@example.com",
    email_confirmed_at: "2024-06-01T10:00:00.000Z",
    app_metadata: { has_password: true, pending_password_setup: null },
    user_metadata: { name: "Password User", playerId: "PW001" },
    created_at: "2024-06-01T09:00:00.000Z",
  },

  /**
   * Fall 3a – Magic-Link-Nutzer, der den Magic Link NIE geklickt hat.
   * email_confirmed_at ist null → kein Nachweis der Email-Kontrolle.
   * app_metadata.has_password: false (explizit gesetzt)
   */
  magicLinkNeverConfirmed: {
    id: "bbbbbbbb-0000-0000-0000-000000000002",
    email: "never-confirmed@example.com",
    email_confirmed_at: null,
    app_metadata: { has_password: false, pending_password_setup: null },
    user_metadata: { name: "Magic Link User", playerId: "ML002" },
    created_at: "2024-07-01T09:00:00.000Z",
  },

  /**
   * Fall 3a (Variante) – Legacy-Nutzer ohne has_password in app_metadata.
   * Führt zu passwordState = "unknown" im check-password Endpunkt.
   * email_confirmed_at ist null.
   */
  legacyNoMetadata: {
    id: "cccccccc-0000-0000-0000-000000000003",
    email: "legacy-user@example.com",
    email_confirmed_at: null,
    app_metadata: {},
    user_metadata: { name: "Legacy User", playerId: "LG003" },
    created_at: "2024-01-01T09:00:00.000Z",
  },

  /**
   * Fall 3b (NUR zur Vollständigkeit, wird in diesen Tests NICHT getestet) –
   * Magic-Link-Nutzer, der sich bereits mind. einmal angemeldet hat.
   * email_confirmed_at ist gesetzt → Bestätigungsmail erforderlich.
   */
  magicLinkPreviouslyConfirmed: {
    id: "dddddddd-0000-0000-0000-000000000004",
    email: "confirmed-magic@example.com",
    email_confirmed_at: "2024-08-01T10:00:00.000Z",
    app_metadata: { has_password: false, pending_password_setup: null },
    user_metadata: { name: "Confirmed Magic Link User", playerId: "CM004" },
    created_at: "2024-07-01T09:00:00.000Z",
  },
};

// ---------------------------------------------------------------------------
// Player-Datensätze (DB-Tabelle players)
// ---------------------------------------------------------------------------

export const mockPlayers = {
  passwordUser: {
    id: "player-pw-001",
    supabaseId: mockAuthUsers.passwordUser.id,
    email: mockAuthUsers.passwordUser.email,
    name: "Password User",
    playerId: "PW001",
    preferredLoginMethod: "password",
  },
  magicLinkNeverConfirmed: {
    id: "player-ml-002",
    supabaseId: mockAuthUsers.magicLinkNeverConfirmed.id,
    email: mockAuthUsers.magicLinkNeverConfirmed.email,
    name: "Magic Link User",
    playerId: "ML002",
    preferredLoginMethod: "magiclink",
  },
  legacyNoMetadata: {
    id: "player-lg-003",
    supabaseId: mockAuthUsers.legacyNoMetadata.id,
    email: mockAuthUsers.legacyNoMetadata.email,
    name: "Legacy User",
    playerId: "LG003",
    preferredLoginMethod: null,
  },
};

// ---------------------------------------------------------------------------
// Supabase-Token-Antworten (wie sie von /auth/v1/token kommen)
// ---------------------------------------------------------------------------

export const mockTokenResponse = (userId: string, email: string) => ({
  access_token: `mock-access-token-${userId}`,
  refresh_token: `mock-refresh-token-${userId}`,
  expires_in: 3600,
  token_type: "bearer",
  user: { id: userId, email },
});

// ---------------------------------------------------------------------------
// Hilfsfunktionen zum Bauen von Mock-Fehlern (identisch mit Server-Pattern)
// ---------------------------------------------------------------------------

export const createMockError = (
  statusCode: number,
  statusMessage: string,
): Error & { statusCode: number; statusMessage: string } => {
  const err = new Error(statusMessage) as any;
  err.statusCode = statusCode;
  err.statusMessage = statusMessage;
  return err;
};
