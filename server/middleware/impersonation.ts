export default defineEventHandler(async (event) => {
  // Check for impersonation header
  const impersonatedUserId = getHeader(event, "x-impersonate-user-id");

  if (impersonatedUserId) {
    // Store impersonated user ID in event context so other handlers can use it
    event.context.impersonatedUserId = impersonatedUserId;
  }
});
