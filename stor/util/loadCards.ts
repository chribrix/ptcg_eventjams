import TCGdex, { CardResumeModel, Query, SetModel } from "@tcgdex/sdk";
import type { CardType } from "~/generated/prisma/enums";

import type prisma from "~/lib/prisma.js";
import type { CardRepository } from "~/server/plugins/CardRepository.js";

export async function loadCards(
  prism: typeof prisma,
  cardRepository: CardRepository
): Promise<void> {
  //  return Promise.resolve();

  const tcgdex = new TCGdex("en");
  const tcgDexDe = new TCGdex("de");

  const releaseDateScarletViolet = new Date("2023-03-01");
  const earliestLegalSetReleaseDate = releaseDateScarletViolet;
  const setRes = await tcgdex.set.list();

  console.log(`Found ${setRes.length} sets from TCGdex API.`);

  // Manual fix for abbrevations
  const fixAbbreviationsMap: Record<string, string> = {
    // TCGdex uses "SV" for Scarlet & Violet, but "SVI" is printed on cards and used for Decklists
    SV: "SVI",
  };
  function fixAbbreviation(set: SetModel) {
    if (set.abbreviation?.official) {
      const abbr = set.abbreviation.official;
      if (fixAbbreviationsMap[abbr]) {
        set.abbreviation.official = fixAbbreviationsMap[abbr];
      }
    }
  }

  let sets: Array<Omit<SetModel, "cardCount" | "cards" | "getSerie">> = [];
  for (const token of setRes) {
    const set: SetModel = await token.getSet();

    fixAbbreviation(set);

    const legal = {
      standard: new Date(set.releaseDate) >= earliestLegalSetReleaseDate,
      expanded: set.legal.expanded,
    };

    //@ts-ignore
    if (set.serie === "Pokémon TCG Pocket") {
      continue;
    }

    sets.push({
      id: set.id,
      legal: legal,
      logo: set.logo,
      name: set.name,
      releaseDate: set.releaseDate,
      serie: set.serie,
      symbol: set.symbol,
      abbreviation: set.abbreviation,
      totalCount: set.cardCount.total,
    });
  }

  if (sets.length === 0) {
    throw new Error("No sets found from TCGdex API.");
  }

  // wait a second
  await new Promise((resolve) => setTimeout(resolve, 1000));
  //async function insertSets(sets: SetModel[]) {}
  await Promise.all(
    sets.map(async (set) => {
      if (!set) {
        console.warn("Set is undefined or null, skipping.");
        return;
      }

      console.log(`Inserting set: ${set.name} (${set.id})`);

      const now = new Date().toISOString();
      console.log(`Current time: ${now}`);
      // Insert all sets
      const result = await prism.cardSet.upsert({
        where: { id: set.id },
        update: {
          name: set.name,
          releaseDate: new Date(set.releaseDate).toISOString(),
          legal: set.legal,
          series: set.serie.name,
          // @ts-ignore
          abbreviation: set.abbreviation?.official ?? null,
          updatedAt: now,
          createdAt: now,
        },
        create: {
          id: set.id,
          name: set.name,
          releaseDate: new Date(set.releaseDate).toISOString(),
          legal: set.legal,
          series: set.serie.name,
          // @ts-ignore
          abbreviation: set.abbreviation?.official ?? null,
          updatedAt: now,
          createdAt: now,
        },
      });

      // Sets before Scarlet & Violet are not required anymore
      sets = sets.filter((set) => {
        if (set && set.releaseDate) {
          const releaseDate = new Date(set.releaseDate);
          return releaseDate >= releaseDateScarletViolet;
        }
        return false;
      });
    })
  );

  for (const set of sets) {
    if (!set) {
      console.warn("Set is undefined or null, skipping.");
      continue;
    }
    const currentSet = set.name;

    console.dir(set, { depth: 5 });
    console.log(`Processing set: ${set.name} (${set.id})`);

    const totalCards = set.totalCount;
    console.log(`Total cards in set: ${totalCards}`);

    const abbrvId = set.abbreviation?.official || null;

    let cards: CardResumeModel[] = [];
    try {
      cards = await tcgdex.card.list(Query.create().equal("set.id", set.id));
    } catch (error) {
      console.error(`Error fetching cards for set ${set.name} (${set.id}):`);
    }

    console.log(
      `Found ${cards.length} cards in set: ${currentSet} (${set.id})`
    );

    let processedCards = 0;
    await Promise.all(
      cards.map(async (card) => {
        try {
          const cardData = await card.getCard();

          // get german card data
          const cardDataDe = await tcgDexDe.card.get(card.id);

          if (!cardDataDe) {
            console.warn(`German card data not found for card ID: ${card.id}`);
            return;
          }

          processedCards++;

          if (!cardData) {
            console.warn(`Card data is undefined for card ID: ${card.id}`);
            return;
          }
          // All of these are currently legal,
          //  TODO handle 2026 rotation
          const legal = {
            standard: true,
            expanded: true,
          };

          // Insert card into database
          //const result = await client(Card).values({
          const a = await prism.card.upsert({
            where: { id: cardData.id },
            update: {
              id: cardData.id,
              printedId: `${abbrvId}-${cardData.id.split("-")[1]}`,
              name: { en: cardData.name, de: cardDataDe!.name },
              imageUrl: cardData.image,
              setCode: set.id,
              rarity: cardData.rarity,
              type: cardData.category.toUpperCase() as CardType,
              legal: legal,
              apiUpdatedAt: cardData.updated,
              updatedAt: new Date().toISOString(), // Use current time for updatedAt
            },
            create: {
              id: cardData.id,
              printedId: `${abbrvId}-${cardData.id.split("-")[1]}`,
              name: { en: cardData.name, de: cardDataDe!.name },
              imageUrl: cardData.image,
              setCode: set.id,
              rarity: cardData.rarity,
              type: cardData.category.toUpperCase() as CardType,
              legal: legal,
              apiUpdatedAt: cardData.updated,
              updatedAt: new Date().toISOString(), // Use current time for updatedAt
            },
          });
        } catch (error) {
          console.error(error);
          // Handle error, e.g., log it or retry
        }
      })
    );
  }
}
