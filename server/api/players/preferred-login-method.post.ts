import { PrismaClient } from "@prisma/client";
import { resolveAuthenticatedPlayerFactory } from "~/server/util/authenticatedPlayer";

const prisma = new PrismaClient();
const resolveAuthenticatedPlayer = resolveAuthenticatedPlayerFactory(prisma);

export default defineEventHandler(async (event) => {
  const player = await resolveAuthenticatedPlayer(event);

  if (!player) {
    throw createError({ statusCode: 404, statusMessage: "Player not found" });
  }

  const body = await readBody<{ method?: "password" | "magiclink" }>(event);
  const method = body?.method;

  if (method !== "password" && method !== "magiclink") {
    throw createError({
      statusCode: 400,
      statusMessage: "method must be 'password' or 'magiclink'",
    });
  }

  await prisma.player.update({
    where: { id: player.id },
    data: { preferredLoginMethod: method },
  });

  return { success: true, method };
});
