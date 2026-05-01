export function applyAdminRoleMetadata(
  currentMetadata: Record<string, unknown> | null | undefined,
  isAdmin: boolean,
) {
  const nextMetadata = { ...(currentMetadata || {}) } as Record<string, unknown>;
  const currentRoles = Array.isArray(nextMetadata.roles)
    ? nextMetadata.roles.filter((entry) => typeof entry === "string")
    : [];
  const normalizedRoles = currentRoles.map((entry) => entry.toLowerCase());

  if (isAdmin) {
    if (!normalizedRoles.includes("admin")) {
      currentRoles.push("admin");
    }

    nextMetadata.is_admin = true;
    nextMetadata.role = "admin";
    nextMetadata.user_role = "admin";
    nextMetadata.roles = currentRoles;
    return nextMetadata;
  }

  const filteredRoles = currentRoles.filter(
    (entry) => entry.toLowerCase() !== "admin",
  );

  nextMetadata.is_admin = false;

  if (nextMetadata.role === "admin") {
    delete nextMetadata.role;
  }

  if (nextMetadata.user_role === "admin") {
    delete nextMetadata.user_role;
  }

  if (filteredRoles.length > 0) {
    nextMetadata.roles = filteredRoles;
  } else {
    delete nextMetadata.roles;
  }

  return nextMetadata;
}