import { z } from "zod";
import { defineAdminRoute } from "~/server/services/admin/adminRoute";

type UpdateAdminUserRoleFn = (input: {
  actorUserId: string;
  targetUserId: string;
  isAdmin: boolean;
}) => Promise<unknown>;

const updateRoleSchema = z.object({
  isAdmin: z.boolean(),
});

type UpdateAdminUserRoleHandlerDependencies = {
  getUserId?: typeof getRouterParam;
  readRequestBody?: typeof readBody;
  updateRole?: UpdateAdminUserRoleFn;
};

export function createAdminUserRolePatchHandler(
  dependencies: UpdateAdminUserRoleHandlerDependencies = {},
) {
  const getUserId =
    dependencies.getUserId ||
    ((event, name) => {
      return getRouterParam(event, name);
    });
  const readRequestBody =
    dependencies.readRequestBody ||
    (async (event) => {
      return readBody(event);
    });
  const updateRole =
    dependencies.updateRole ||
    (async (input) => {
      const { updateAdminUserRole } = await import(
        "~/server/services/admin/adminUserService"
      );
      return updateAdminUserRole(input);
    });

  return async ({
    event,
    adminUser,
  }: {
    event: Parameters<typeof getRouterParam>[0];
    adminUser: { id: string };
  }) => {
    const userId = getUserId(event, "id");
    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: "User ID is required",
      });
    }

    const body = updateRoleSchema.parse(await readRequestBody(event));
    return updateRole({
      actorUserId: adminUser.id,
      targetUserId: userId,
      isAdmin: body.isAdmin,
    });
  };
}

export default defineAdminRoute(createAdminUserRolePatchHandler());