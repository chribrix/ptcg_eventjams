import { ZodError } from "zod";
import { verifyAdmin } from "~/server/util/adminAccess";

type AdminRouteHandler<T> = (context: {
  event: Parameters<typeof verifyAdmin>[0];
  adminUser: Awaited<ReturnType<typeof verifyAdmin>>;
}) => Promise<T>;

export function defineAdminRoute<T>(handler: AdminRouteHandler<T>) {
  return defineEventHandler(async (event) => {
    try {
      const adminUser = await verifyAdmin(event);
      return await handler({ event, adminUser });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw createError({
          statusCode: 400,
          statusMessage: error.issues[0]?.message || "Invalid request payload",
          data: error.flatten(),
        });
      }

      if (error && typeof error === "object" && "statusCode" in error) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : "Internal server error";

      throw createError({
        statusCode: 500,
        statusMessage: message,
      });
    }
  });
}