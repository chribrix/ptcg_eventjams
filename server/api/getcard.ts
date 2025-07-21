import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  return {
    card: await prisma.card.findFirst(),
  };
});
