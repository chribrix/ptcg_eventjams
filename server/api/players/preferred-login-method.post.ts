import { PrismaClient } from "@prisma/client";
import { serverSupabaseUser } from "#supabase/server";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = await readBody<{ method?: "password" | "magiclink" }>(event);
  const method = body?.method;

  if (method !== "password" && method !== "magiclink") {
    throw createError({
      statusCode: 400,
      statusMessage: "method must be 'password' or 'magiclink'",
    });
  }

  await prisma.$executeRaw`
    UPDATE public.players
    SET preferred_login_method = ${method}
    WHERE supabase_id = ${user.id}
       OR LOWER(email) = LOWER(${user.email || ""})
  `;

  return { success: true, method };
});
