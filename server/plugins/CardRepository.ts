/**
 *  TODO
 *  This repo is connected to the database
 *  - database is filled beforehand with cards
 *  - fill function also handles rulings:
 *     - legality (also for reprints)
 *     - One-Only cards like ace specs
 *  -
 */

import type { Card, CardSet, EnergyAbbreviationMap } from "@prisma/client";
import prisma from "~/lib/prisma";


export default defineEventHandler(async (event) => {
  const nitroApp = useNitroApp();

  nitroApp.cardRepository = new CardRepository();

})


export class CardRepository {

  #energyAbbrvMap: EnergyAbbreviationMap[] | null = null;
  #energyTypeMap: any = null;
  #energyAliasMap: any = null;
  #setCodesMap: any = null;

  async getConversions() {
    await this.getEnergyAbbrvMap();
    await this.getEnergyTypeMap();
    await this.getEnergyAliasMap();
    await this.getSetCodesMap();
  }

  async hello() {
    console.log("Hello from CardRepository!");
  }

  private async getEnergyAbbrvMap(): Promise<EnergyAbbreviationMap[]> {
    if (this.#energyAbbrvMap) {
      return this.#energyAbbrvMap;
    }
    //this._energyAbbrvMap ??=
    const energyAbbrvMap = await prisma.energyAbbreviationMap.findMany(
    )
      .catch((error) => {
        throw new Error(`Failed to fetch energy abbreviation map: ${error.message}`);
      })

    this.#energyAbbrvMap = energyAbbrvMap;

    return energyAbbrvMap
  }

  private async getEnergyTypeMap(): Promise<any> {
    if (this.#energyTypeMap) {
      return this.#energyTypeMap;
    }

    const energyTypeMapEn = await prisma.energyTypeMap.findMany()
      .catch((error) => {
        throw new Error(`Failed to fetch energy type map (EN): ${error.message}`);
      });

    this.#energyTypeMap = energyTypeMapEn;
    return energyTypeMapEn
  }

  private async getEnergyAliasMap(): Promise<any> {
    if (this.#energyAliasMap) {
      return this.#energyAliasMap;
    }

    const energyAliasMap = await prisma.energyAliasMap.findMany()
      .catch((error) => {
        throw new Error(`Failed to fetch energy alias map: ${error.message}`);
      });

    this.#energyAliasMap = energyAliasMap;
    return energyAliasMap
  }

  private async getSetCodesMap(): Promise<any> {
    if (this.#setCodesMap) {
      return this.#setCodesMap;
    }

    const setCodesMap = await prisma.setCodes.findMany()
      .catch((error) => {
        throw new Error(`Failed to fetch international to Japanese set map: ${error.message}`);
      });

    this.#setCodesMap = setCodesMap;
    return setCodesMap
  }

  public constructor() {
    this.getConversions()
  }


  async init() {
    await prisma.$connect().catch((error) => {
      throw new Error(`Failed to connect to the database: ${error.message}`);
    });
    await this.getConversions();

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
        where:
        {
          OR: [
            { name: { path: ['en'], equals: name } },
            { name: { path: ['de'], equals: name } },
            { name: { path: ['fr'], equals: name } },
            { name: { path: ['it'], equals: name } },
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
    const res = await prisma.card.findFirst({
      where:
      {
        AND:
          [
            { setCode: id, },
            {
              OR: [
                { name: { path: ['en'], equals: name } },
                { name: { path: ['de'], equals: name } },
                { name: { path: ['fr'], equals: name } },
                { name: { path: ['it'], equals: name } },
              ]
            }
          ]
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


