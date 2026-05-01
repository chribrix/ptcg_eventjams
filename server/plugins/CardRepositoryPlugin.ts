import prisma from "~/lib/prisma";

import { loadCards } from "~/stor/util/loadCards";
import { CardRepository } from "../util/repository/CardRepository";

let initializationPromise: Promise<void> | null = null;

const hasSeededCardData = async () => {
  const [setCount, cardCount, energyMapCount] = await Promise.all([
    prisma.cardSet.count(),
    prisma.card.count(),
    prisma.energyAbbreviationMap.count(),
  ]);

  return setCount > 0 && cardCount > 0 && energyMapCount > 0;
};

const initializeCardData = async () => {
  // Skip database initialization in CI/test environments
  if (process.env.SKIP_DB_INIT === "true" || process.env.NODE_ENV === "test") {
    console.info("Skipping database initialization in test/CI environment.");
    return;
  }

  const metaState = await prisma.metaState.findFirst({
    where: { id: "db_init" },
  });

  if (metaState?.value === "initalized") {
    console.info("Database already initialized, skipping initialization.");
    return;
  }

  console.info("Initializing database in background...");

  try {
    await loadCards(prisma);
  } catch (error) {
    if (await hasSeededCardData()) {
      console.warn(
        "Card data refresh failed, but existing local card data is available. Continuing without remote refresh.",
        error instanceof Error ? error.message : String(error),
      );
      return;
    }

    throw error;
  }

  await prisma.metaState.upsert({
    where: { id: "db_init" },
    update: { value: "initalized" },
    create: { id: "db_init", value: "initalized" },
  });
};

export default defineNitroPlugin((nitroApp) => {
  nitroApp.cardRepository = nitroApp.cardRepository || new CardRepository();

  if (!initializationPromise) {
    initializationPromise = initializeCardData().catch(async (error) => {
      console.error("Error initializing database:", error);

      await prisma.metaState
        .upsert({
          where: { id: "db_init" },
          update: { value: "failed" },
          create: { id: "db_init", value: "failed" },
        })
        .catch(() => undefined);
    });
  }
});
