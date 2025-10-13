/**
 * Minimal test data seeder for CI environment
 * Creates basic test data without making external API calls
 */
import type { PrismaClient } from "~/generated/prisma";

export async function seedTestData(prisma: PrismaClient): Promise<void> {
  console.log("Seeding minimal test data for CI...");

  // Create a test card set
  await prisma.cardSet.upsert({
    where: { id: "test-set-1" },
    create: {
      id: "test-set-1",
      name: "Test Set 1",
      series: "Test Series",
      legal: { standard: true, expanded: true },
      abbreviation: "TST1",
      releaseDate: new Date("2024-01-01"),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    update: {
      name: "Test Set 1",
      updatedAt: new Date(),
    },
  });

  // Create a few test cards
  const testCards = [
    {
      id: "test-card-1",
      printedId: "TST1-001",
      name: { en: "Test Pokemon", de: "Test Pokemon" },
      setCode: "test-set-1",
      rarity: "Common",
      type: "POKEMON" as const,
    },
    {
      id: "test-card-2",
      printedId: "TST1-002",
      name: { en: "Test Trainer", de: "Test Trainer" },
      setCode: "test-set-1",
      rarity: "Uncommon",
      type: "TRAINER" as const,
    },
    {
      id: "test-card-3",
      printedId: "TST1-003",
      name: { en: "Test Energy", de: "Test Energy" },
      setCode: "test-set-1",
      rarity: "Common",
      type: "ENERGY" as const,
    },
  ];

  for (const card of testCards) {
    await prisma.card.upsert({
      where: { id: card.id },
      create: {
        ...card,
        legal: { standard: true, expanded: true },
        imageUrl: `https://example.com/cards/${card.id}.jpg`,
        apiUpdatedAt: new Date(),
        updatedAt: new Date(),
      },
      update: {
        name: card.name,
        updatedAt: new Date(),
      },
    });
  }

  // Mark database as initialized for tests
  await prisma.metaState.upsert({
    where: { id: "db_init" },
    create: {
      id: "db_init",
      value: "test_initialized",
    },
    update: {
      value: "test_initialized",
    },
  });

  console.log("✅ Test data seeding completed");
}
