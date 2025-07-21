/**
 *  TODO
 *  This repo is connected to the database
 *  - database is filled beforehand with cards
 *  - fill function also handles rulings:
 *     - legality (also for reprints)
 *     - One-Only cards like ace specs
 *  -
 */

/*
export class CardRepository {
  async getConversions() {
    // TODO implement schema for conversions
    // TODO query from database conversions.energy_abbrv_map
    const energyAbbrvMap = await this.em.find(
      "conversions.energy_type_map_en",
      {}
    );

    console.log("hello from CardRepository.getConversions");

    console.log("Energy Abbreviation Map:", energyAbbrvMap);
  }
  private mikroOrm: MikroORM | null = null;
  private _em: EntityManager | null = null;

  private constructor(mikroOrm: MikroORM) {
    this.mikroOrm = mikroOrm;
    this._em = mikroOrm.em.fork(); // Use a forked EntityManager for operations
  }

  static async hello() {
    console.log("Hello from CardRepository!");
    return "Hello from CardRepository!";
  }
  static async init() {
    console.log("Initializing CardRepository...");
    const mikroOrm = await MikroORM.init();

    // get metadata from db
    const dbMeta = await mikroOrm.em
      .fork()
      .findOne(MetaState, { id: "cards_filled" });
    console.log("Database Meta State:", dbMeta);
    if (!dbMeta) {
      await fillDb();
    }

    console.log("CardRepository initialized successfully.");
    return new CardRepository(mikroOrm);
  }

  get em(): EntityManager {
    if (!this._em) {
      throw new Error("EntityManager is not initialized.");
    }
    return this._em;
  }

  public async getSetById(id: string): Promise<CardSet | null> {
    const set = await this.em.findOne(CardSet, { id });
    return set;
  }

  public async getCardById(id: string): Promise<any> {
    return await this.em.findOne(Cards, { id });
  }

  getCardByName(name: string) {
    return this.em
      .findOne(Cards, {
        $or: [
          { name: { en: name } },
          { name: { de: name } },
          { name: { fr: name } },
          { name: { it: name } },
        ],
      })
      .catch((error) => {
        console.error("Error fetching card by name:", error);
        return null;
      });
  }

  public async getCardsBySetId(setId: string): Promise<Cards[] | null> {
    const res = await this.em.find(Cards, { set: setId });

    return res;
  }

  async getCardByNameAndId(name: string, id: string) {
    const res = await this.em
      .findOne(Cards, {
        $and: [
          {
            $or: [
              { name: { en: name } },
              { name: { de: name } },
              { name: { fr: name } },
              { name: { it: name } },
            ],
            id: id,
          },
        ],
      })
      .catch((error) => {
        console.error("Error fetching card by name and set ID:", error);
        return null;
      });

    return res;
  }

  public async getMultipleCardsByIds(ids: string[]): Promise<Cards[] | null> {
    if (!ids || ids.length === 0) return [];

    const cards = await this.em.find(Cards, { id: { $in: ids } });

    return cards;
  }

  public async close() {
    if (this.mikroOrm) {
      await this.mikroOrm.close();
    }
  }

  public static async fillDatabase() {
    const mikroOrm = await MikroORM.init();
    const repository = new CardRepository(mikroOrm);
    await fillDb();
    await repository.close();
  }
}
export default CardRepository;
*/
