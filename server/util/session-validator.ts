/**
 * Session validation based on deployment timestamp
 * All sessions created before the current deployment are invalidated
 */

// This timestamp is set during build/deploy and stored in runtime config
// When users try to access the app with old sessions, they'll be forced to re-login
export function isSessionValid(sessionCreatedAt: number): boolean {
  const deployTimestamp = useRuntimeConfig().public.deployTimestamp;

  // If no deploy timestamp is set, allow all sessions (fallback for dev)
  if (!deployTimestamp) {
    return true;
  }

  // Session is valid only if it was created after this deployment
  return sessionCreatedAt >= parseInt(deployTimestamp);
}

export function getCurrentDeployTimestamp(): number | null {
  const deployTimestamp = useRuntimeConfig().public.deployTimestamp;
  return deployTimestamp ? parseInt(deployTimestamp) : null;
}
