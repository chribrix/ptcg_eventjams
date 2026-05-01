import { PrismaClient } from "@prisma/client";
import { verifyAdmin } from "../../../middleware/admin";

export default defineEventHandler(async (event) => {
  const prisma = new PrismaClient();

  try {
    await verifyAdmin(event);

    // Get query parameters
    const query = getQuery(event);
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 50;
    const errorType = query.errorType as string | undefined;
    const userId = query.userId as string | undefined;
    const search = query.search as string | undefined;

    // Build where clause
    const where: any = {};

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
});
