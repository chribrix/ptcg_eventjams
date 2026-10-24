# Authentication architecture

- The client-side authority for session refresh and invalidation is `services/authSessionService.ts`. Do not add component-local timers, direct refresh calls, or alternative client session managers.
- The server-side authority for end-user identity is `server/services/auth/authService.ts`. API routes must use `resolveOptionalAuthUser` or `requireAuthUser`; do not import `serverSupabaseUser`, parse bearer tokens, or call `auth.getUser(accessToken)` directly in routes.
- `SUPABASE_SERVICE_ROLE_KEY` is restricted to server-only administrative operations. Never expose it through `runtimeConfig.public`, build arguments, browser code, responses, logs, errors, or analytics.
- Never persist cookies, authorization headers, access tokens, refresh tokens, passwords, or secret values in logs. Log only safe identifiers and redacted diagnostics.
- Protected API operations validate identity server-side; client-side role state is never authorization.
