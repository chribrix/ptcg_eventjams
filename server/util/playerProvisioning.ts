import { createError } from "h3";

// Centralized player provisioning helpers.
//
// These functions are the only write-side path that should create or bind the
// canonical local Player row for an authenticated Supabase user.

export type PlayerProvisioningClient = {
  player: {
    findUnique: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
};

export type ProvisionPlayerInput = {
  supabaseId: string;
  email: string;
  name: string;
  playerId: string;
  preferredLoginMethod?: "password" | "otp" | "magiclink";
  birthDate?: Date;
};

export const normalizePreferredLoginMethod = (
  method?: "password" | "otp" | "magiclink" | null,
): "password" | "otp" => {
  return method === "otp" || method === "magiclink" ? "otp" : "password";
};

export type AuthUserProvisioningSource = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any> | null;
  raw_user_meta_data?: Record<string, any> | null;
};

const DEFAULT_BIRTH_DATE = new Date("2000-01-01T00:00:00.000Z");

export const getProvisionPlayerInputFromAuthUser = (
  authUser: AuthUserProvisioningSource,
  options: {
    preferredLoginMethod?: "password" | "otp" | "magiclink";
    fallbackEmail?: string | null;
    birthDate?: Date;
  } = {},
): ProvisionPlayerInput | null => {
  const metadata = authUser.user_metadata || authUser.raw_user_meta_data || {};
  const email = (options.fallbackEmail || authUser.email || "").trim();

  if (!authUser.id || !email || !metadata?.name || !metadata?.playerId) {
    return null;
  }

  return {
    supabaseId: authUser.id,
    email,
    name: String(metadata.name),
    playerId: String(metadata.playerId),
    preferredLoginMethod: options.preferredLoginMethod,
    birthDate: options.birthDate,
  };
};

export const ensurePlayerForAuthUser = async (
  prisma: PlayerProvisioningClient,
  input: ProvisionPlayerInput,
) => {
  const normalizedEmail = input.email.trim().toLowerCase();
  const preferredLoginMethod = normalizePreferredLoginMethod(
    input.preferredLoginMethod,
  );

  const existingBySupabaseId = await prisma.player.findUnique({
    where: { supabaseId: input.supabaseId },
  });

  if (existingBySupabaseId) {
    return prisma.player.update({
      where: { id: existingBySupabaseId.id },
      data: {
        email: normalizedEmail,
        name: input.name,
        playerId: input.playerId,
        preferredLoginMethod,
      },
    });
  }

  const existingByPlayerId = await prisma.player.findUnique({
    where: { playerId: input.playerId },
  });

  if (existingByPlayerId) {
    if (
      existingByPlayerId.supabaseId &&
      existingByPlayerId.supabaseId !== input.supabaseId
    ) {
      throw createError({
        statusCode: 409,
        statusMessage: "Player ID already exists",
      });
    }

    return prisma.player.update({
      where: { id: existingByPlayerId.id },
      data: {
        supabaseId: input.supabaseId,
        email: normalizedEmail,
        name: input.name,
        preferredLoginMethod,
      },
    });
  }

  const existingByEmail = await prisma.player.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingByEmail) {
    throw createError({
      statusCode: 409,
      statusMessage: "Email already registered",
    });
  }

  return prisma.player.create({
    data: {
      supabaseId: input.supabaseId,
      playerId: input.playerId,
      name: input.name,
      email: normalizedEmail,
      preferredLoginMethod,
      birthDate: input.birthDate || DEFAULT_BIRTH_DATE,
    },
  });
};
