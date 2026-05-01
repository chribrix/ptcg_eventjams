import { PrismaClient } from "@prisma/client";
import { defineAdminRoute } from "~/server/services/admin/adminRoute";

type ErrorLogsQuery = {
  page?: string | number;
  limit?: string | number;
  errorType?: string;
  userId?: string;
  search?: string;
};

type ErrorLogRecord = {
  id: string;
  errorType: string;
  errorMessage: string;
  userId: string | null;
  userEmail: string | null;
  url: string | null;
  createdAt: Date;
};

type ErrorLogFindManyArgs = {
  where: Record<string, unknown>;
  orderBy: { createdAt: "desc" };
  skip: number;
  take: number;
};

type ErrorLogClient = {
  errorLog: {
    count: (args: { where: Record<string, unknown> }) => Promise<number>;
    findMany: (args: ErrorLogFindManyArgs) => Promise<ErrorLogRecord[]>;
  };
  $disconnect: () => Promise<void>;
};

type ErrorLogsHandlerDependencies = {
  createPrismaClient?: () => ErrorLogClient;
  readQuery?: (event: unknown) => ErrorLogsQuery;
};

export function createAdminErrorLogsHandler(
  dependencies: ErrorLogsHandlerDependencies = {},
) {
  const {
    createPrismaClient = () => new PrismaClient(),
    readQuery = (event) => getQuery(event as Parameters<typeof getQuery>[0]),
  } = dependencies;

  return async ({ event }: { event: unknown }) => {
    const prisma = createPrismaClient();

    try {
      // Get query parameters
      const query = readQuery(event);
      const page = parseInt(String(query.page ?? "1"), 10) || 1;
      const limit = parseInt(String(query.limit ?? "50"), 10) || 50;
      const errorType = query.errorType;
      const userId = query.userId;
      const search = query.search;

      // Build where clause
      const where: Record<string, unknown> = {};

      if (errorType) {
        // Always treat UI-provided errorType as a category filter.
        // This makes filters like 'magic_login' include both:
        // - magic_login_* errors
        // - info_magic_login_* success logs
        where.errorType = {
          contains: errorType.replaceAll("*", ""),
          mode: "insensitive",
        };
      }

      if (userId) {
        where.userId = userId;
      }

      // Add search functionality - searches across multiple fields
      if (search) {
        where.OR = [
          { errorMessage: { contains: search, mode: "insensitive" } },
          { userEmail: { contains: search, mode: "insensitive" } },
          { errorType: { contains: search, mode: "insensitive" } },
          { userId: { contains: search, mode: "insensitive" } },
          { url: { contains: search, mode: "insensitive" } },
        ];
      }

      // Get total count
      const total = await prisma.errorLog.count({ where });

      // Get error logs with pagination
      const errorLogs = await prisma.errorLog.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        errorLogs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Failed to fetch error logs:", error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  };
}

export default defineAdminRoute(createAdminErrorLogsHandler());
