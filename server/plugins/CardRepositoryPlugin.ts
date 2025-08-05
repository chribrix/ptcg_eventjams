import prisma from "~/lib/prisma";

import { loadCards } from "~/stor/util/loadCards";
import { CardRepository } from "../util/repository/CardRepository";

export default defineEventHandler(async (event) => {
  const nitroApp = useNitroApp();
  nitroApp.cardRepository = new CardRepository();

  const metaState = await prisma.metaState.findFirst({
    where: { id: "db_init" },
  });

  if (metaState?.value === "initalized") {
    console.info("Database already initialized, skipping initialization.");
    return;
  }

  console.info("Initializing database...");

  // initialize db
  await loadCards(prisma).catch(async (error) => {
    console.error("Error initializing database:", error);
    await prisma.metaState.upsert({
      where: { id: "db_init" },
      update: { value: "failed" },
      create: { id: "db_init", value: "failed" },
    });
    throw new Error(`Database initialization failed: ${error.message}`);
  });

  await prisma.metaState.upsert({
    where: { id: "db_init" },
    update: { value: "initalized" },
    create: { id: "db_init", value: "initalized" },
  });
});
