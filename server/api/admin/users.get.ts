import { defineAdminRoute } from "~/server/services/admin/adminRoute";

type ListAdminUsersFn = (query: ReturnType<typeof getQuery>) => Promise<unknown>;

type ListAdminUsersHandlerDependencies = {
  listUsers?: ListAdminUsersFn;
  readQuery?: typeof getQuery;
};

export function createAdminUsersListHandler(
  dependencies: ListAdminUsersHandlerDependencies = {},
) {
  const listUsers =
    dependencies.listUsers ||
    (async (query) => {
      const { listAdminUsers } = await import(
        "~/server/services/admin/adminUserService"
      );
      return listAdminUsers(query);
    });
  const readQuery =
    dependencies.readQuery ||
    ((event) => {
      return getQuery(event);
    });

  return async ({ event }: { event: Parameters<typeof getQuery>[0] }) => {
    return listUsers(readQuery(event));
  };
}

export default defineAdminRoute(createAdminUsersListHandler());