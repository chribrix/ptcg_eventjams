import { describe, expect, it } from "vitest";
import { applyAdminRoleMetadata } from "~/server/services/admin/adminRoleMetadata";

describe("applyAdminRoleMetadata", () => {
  it("adds canonical admin metadata fields when granting admin", () => {
    const result = applyAdminRoleMetadata({ roles: ["editor"] }, true);

    expect(result.is_admin).toBe(true);
    expect(result.role).toBe("admin");
    expect(result.user_role).toBe("admin");
    expect(result.roles).toEqual(["editor", "admin"]);
  });

  it("removes admin markers while preserving unrelated metadata when revoking admin", () => {
    const result = applyAdminRoleMetadata(
      {
        is_admin: true,
        role: "admin",
        user_role: "admin",
        roles: ["admin", "editor"],
        has_password: true,
      },
      false,
    );

    expect(result.is_admin).toBe(false);
    expect(result.role).toBeUndefined();
    expect(result.user_role).toBeUndefined();
    expect(result.roles).toEqual(["editor"]);
    expect(result.has_password).toBe(true);
  });
});