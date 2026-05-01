import { PrismaClient } from "@prisma/client";
import { resolveAuthenticatedPlayerFactory } from "~/server/util/authenticatedPlayer";
import { toStoredPreferredLoginMethod } from "~/server/util/playerProvisioning";

const prisma = new PrismaClient();
const resolveAuthenticatedPlayer = resolveAuthenticatedPlayerFactory(prisma);

export default defineEventHandler(async (event) => {
  const player = await resolveAuthenticatedPlayer(event);

  if (!player) {
    throw createError({ statusCode: 404, statusMessage: "Player not found" });
  }

  const body = await readBody<{ method?: "password" | "otp" }>(event);
  const rawMethod = body?.method;

  if (rawMethod !== "password" && rawMethod !== "otp") {
    throw createError({
      statusCode: 400,
      statusMessage: "method must be 'password' or 'otp'",
    });
  }

  const method = toStoredPreferredLoginMethod(rawMethod);

  await prisma.player.update({
    where: { id: player.id },
    data: { preferredLoginMethod: method },
  });

  return { success: true, method };
});
