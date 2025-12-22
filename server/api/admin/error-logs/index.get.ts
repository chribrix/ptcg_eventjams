import { PrismaClient } from "@prisma/client";
import { serverSupabaseUser } from "#supabase/server";

export default defineEventHandler(async (event) => {
  const prisma = new PrismaClient();

  try {
    // Get authentication from Supabase
    const user = await serverSupabaseUser(event);

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    // Check if user is admin
    const adminUser = await prisma.adminUser.findUnique({
      where: { id: user.id },
    });

    if (!adminUser) {
      throw createError({
        statusCode: 403,
        statusMessage: "Forbidden - Admin access required",
      });
    }

    // Get query parameters
    const query = getQuery(event);
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 50;
    const errorType = query.errorType as string | undefined;
    const userId = query.userId as string | undefined;

    // Build where clause
    const where: any = {};
    if (errorType) {
      where.errorType = errorType;
    }
    if (userId) {
      where.userId = userId;
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
