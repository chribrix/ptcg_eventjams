# Authentication architecture

- The client-side authority for session refresh and invalidation is `services/authSessionService.ts`. Do not add component-local timers, direct refresh calls, or alternative client session managers.
- The server-side authority for end-user identity is `server/services/auth/authService.ts`. API routes must use `resolveOptionalAuthUser` or `requireAuthUser`; do not import `serverSupabaseUser`, parse bearer tokens, or call `auth.getUser(accessToken)` directly in routes.
- `SUPABASE_SERVICE_ROLE_KEY` is restricted to server-only administrative operations. Never expose it through `runtimeConfig.public`, build arguments, browser code, responses, logs, errors, or analytics.
- Never persist cookies, authorization headers, access tokens, refresh tokens, passwords, or secret values in logs. Log only safe identifiers and redacted diagnostics.
- Protected API operations validate identity server-side; client-side role state is never authorization.

# Architecture rework

- Keep `aidocs/CHRISPYJAMS_ARCHITEKTURVORSCHLAG.md` and the linked implementation plan current as working documents. Record decisions, migrations, compatibility changes, verification results, and remaining gaps as the rework proceeds.
- Put cross-cutting behavior in one shared, tested utility or service with a clear owner and public interface. Examples: authenticated actor and tenant context, permission checks, event references, date/time conversion, safe diagnostics, and API error mapping. Reuse the existing authorities above. Do not duplicate global rules in routes, components, or individual modules. Domain-specific logic stays inside its owning module; `utils/` must not become a catch-all for business logic.
- Each submodule or service must have a README next to its module boundary documenting purpose, owned data, public API/contracts, dependencies and interactions with other modules, authorization/tenant scope, deployment mode, and verification/operational notes. Update the README in the same change as behavior or contract changes. The documentation index is `aidocs/architecture/MODULES.md`; the READMEs in `modules/` are planning documents until implementation code moves there.
- Design module contracts so the same application can call them in-process in a combined deployment or through a transport adapter in a separate deployment. No module may depend on another module's private tables, internal imports, or UI state. Cross-module writes require an explicit command or event contract and documented consistency behavior.
- Preserve existing behavior through the migration. Before changing a feature, record its current route/UI behavior and add meaningful characterization or integration coverage. Run the relevant checks for both the combined mode and any separately deployed mode that the change affects. Do not remove an old route or data representation until consumers are migrated and parity is verified.
