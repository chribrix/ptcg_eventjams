import type { Card, CardSet } from "@prisma/client";

import prisma from "~/lib/prisma";

export class CardRepository {
  async getRandomCard() {
    return prisma.card
      .findFirst({
        orderBy: { updatedAt: "desc" },
      })
      .catch((error) => {
        console.error("Error fetching random card:", error);
        return null;
      });
  }
  #energyAbbrvMap: Record<string, string> | null = null;
  #energyTypeMap: Record<string, string> | null = null;
  #energyAliasMap: Record<string, string> | null = null;
  #setCodesMap: Record<string, string> | null = null;
  public constructor() {
    this.loadConversions();
  }

  async loadConversions() {
    await this.getEnergyAbbrvMap();
    await this.getEnergyTypeMap();
    await this.getEnergyAliasMap();
    await this.getSetCodesMap();
  }

  async getConversions() {
    return {
      energyAbbrvMap: await this.getEnergyAbbrvMap(),
      energyTypeMap: await this.getEnergyTypeMap(),
      energyAliasMap: await this.getEnergyAliasMap(),
      setCodesMap: await this.getSetCodesMap(),
    };
  }

  async getEnergyAbbrvMap(): Promise<Record<string, string>> {
    if (this.#energyAbbrvMap) {
      return this.#energyAbbrvMap;
    }

    const response = await prisma.energyAbbreviationMap
      .findMany()
      .catch((error) => {
        throw new Error(
          `Failed to fetch energy abbreviation map: ${error.message}`
        );
      });

    const energyAbbrvMap: Record<string, string> = response.reduce(
      (acc, { ptcglExport, fullText }) => {
        acc[ptcglExport] = fullText;
        return acc;
      },
      {} as Record<string, string>
    );

    return energyAbbrvMap;
  }

  async getEnergyTypeMap(): Promise<Record<string, string>> {
    if (this.#energyTypeMap) {
      return this.#energyTypeMap;
    }

    const response = await prisma.energyTypeMap.findMany().catch((error) => {
      throw new Error(`Failed to fetch energy type map (EN): ${error.message}`);
    });

    const energyTypeMap: Record<string, string> = response.reduce(
      (acc, { energyType, fullText }) => {
        acc[energyType] = fullText;
        return acc;
      },
      {} as Record<string, string>
    );

    this.#energyTypeMap = energyTypeMap;
    return energyTypeMap;
  }

  async getEnergyAliasMap(): Promise<Record<string, string>> {
    if (this.#energyAliasMap) {
      return this.#energyAliasMap;
    }

    const response = await prisma.energyAliasMap.findMany().catch((error) => {
      throw new Error(`Failed to fetch energy alias map: ${error.message}`);
    });

    const energyAliasMap: Record<string, string> = response.reduce(
      (acc, { alias, canonical }) => {
        acc[alias] = canonical;
        return acc;
      },
      {} as Record<string, string>
    );

    this.#energyAliasMap = energyAliasMap;
    return energyAliasMap;
  }

  async getSetCodesMap(): Promise<Record<string, string>> {
    if (this.#setCodesMap) {
      return this.#setCodesMap;
    }

    const response = await prisma.setCodes.findMany().catch((error) => {
      throw new Error(`Failed to fetch set codes map: ${error.message}`);
    });

    const setCodesMap: Record<string, string> = response.reduce(
      (acc, { intlCode, japaneseCode }) => {
        acc[intlCode] = japaneseCode;
        return acc;
      },
      {} as Record<string, string>
    );

    this.#setCodesMap = setCodesMap;
    return setCodesMap;
  }

  async init() {
    await prisma.$connect().catch((error) => {
      throw new Error(`Failed to connect to the database: ${error.message}`);
    });
    await this.loadConversions();

    console.debug("CardRepository initialized and conversions fetched.");
  }

  public async getSetById(id: string): Promise<CardSet | null> {
    return await prisma.cardSet.findUnique({ where: { id } });
  }

  public async getCardById(id: string): Promise<any> {
    return await prisma.card.findUnique({ where: { id } });
  }

  async getCardByName(name: string) {
    return await prisma.card
      .findFirst({
        where: {
          OR: [
            { name: { path: ["en"], equals: name } },
            { name: { path: ["de"], equals: name } },
            { name: { path: ["fr"], equals: name } },
            { name: { path: ["it"], equals: name } },
          ],
        },
      })
      .catch((error) => {
        console.error("Error fetching card by name:", error);
        return null;
      });
  }

  public async getCardsBySetId(setId: string): Promise<Card[]> {
    return prisma.card.findMany({ where: { setCode: setId } });
  }

  async getCardByNameAndId(name: string, id: string) {
    const res = await prisma.card
      .findFirst({
        where: {
          AND: [
            { id },
            {
              OR: [
                { name: { path: ["en"], equals: name } },
                { name: { path: ["de"], equals: name } },
                { name: { path: ["fr"], equals: name } },
                { name: { path: ["it"], equals: name } },
              ],
            },
          ],
        },
      })
      .catch((error) => {
        console.error("Error fetching card by name and set ID:", error);
        return null;
      });

    return res;
  }

  public async getMultipleCardsByIds(ids: string[]): Promise<Card[]> {
    if (!ids || ids.length === 0) return [];

    return prisma.card.findMany({ where: { id: { in: ids } } });
  }
}
