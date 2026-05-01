const ADMIN_PASSWORD_RESET_ENABLED_KEY = "admin_password_reset_enabled";
const ADMIN_PASSWORD_RESET_REQUESTED_AT_KEY =
  "admin_password_reset_requested_at";

type AuthMetadata = Record<string, any> | null | undefined;

export function isAdminPasswordResetEnabled(metadata: AuthMetadata): boolean {
  return metadata?.[ADMIN_PASSWORD_RESET_ENABLED_KEY] === true;
}

export function markAdminPasswordResetEnabled(metadata: AuthMetadata) {
  return {
    ...(metadata || {}),
    [ADMIN_PASSWORD_RESET_ENABLED_KEY]: true,
    [ADMIN_PASSWORD_RESET_REQUESTED_AT_KEY]: new Date().toISOString(),
  };
}

export function clearAdminPasswordResetState(metadata: AuthMetadata) {
  const nextMetadata = { ...(metadata || {}) };
  delete nextMetadata[ADMIN_PASSWORD_RESET_ENABLED_KEY];
  delete nextMetadata[ADMIN_PASSWORD_RESET_REQUESTED_AT_KEY];
  return nextMetadata;
}
