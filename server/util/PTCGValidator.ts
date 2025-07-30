import { CardRepository } from "../plugins/CardRepository.js";
import {
  energyAbbrvMap,
  energyAliasMap,
  energyTypeMapEn,
  intlToJapaneseSetMap,
} from "../../stor/util/conversions.js";

export type ValidationResult = {
  isValid: boolean;
  errors?: Array<string>;
};

type CardToken = {
  inDeck: number;
  name: string;
  setId?: number;
  set?: string;
  legal?: { standard: boolean; expanded?: boolean };
  rarity?: string;
};

type DeckSections = {
  pokemonCards: string[];
  trainerCards: string[];
  energyCards: string[];
};

class PTCGDeckValidator {
  #cardRepo: CardRepository | null = null;
  constructor() {
    this.#cardRepo = useNitroApp().cardRepository;
    if (!this.#cardRepo) {
      throw new Error("CardRepository is not initialized.");
    }
  }

  get cardRepository() {
    return (this.#cardRepo ??= useNitroApp().cardRepository);
  }
  parseDeck(deckString: string) {
    const lines = deckString.split(/\r?\n/);

    const pokemonCards: Array<string> = [];
    const trainerCards: Array<string> = [];
    const energyCards: Array<string> = [];
    const errors: Array<string> = [];

    let currentSection: keyof DeckSections | null = null;

    const pokemonPattern = /^\d+ .+ [A-Za-z-]{2,5} \d{1,3}$/;
    const optionalSetPattern = /^\d+ .+(?: [A-Za-z-]{2,5} \d{1,3})?$/;

    const pokemonHeaderPattern = /^Pokémon:(?: \d+)?$/;
    const trainerHeaderPattern = /^Trainer:(?: \d+)?$/;
    const energyHeaderPattern = /^(Energy|Energie)(: \d+)?$/;

    for (const line of lines) {
      if (pokemonHeaderPattern.test(line)) {
        currentSection = "pokemonCards";
        continue;
      }
      if (trainerHeaderPattern.test(line)) {
        currentSection = "trainerCards";
        continue;
      }
      if (energyHeaderPattern.test(line)) {
        currentSection = "energyCards";
        continue;
      }
      if (line.trim() === "") continue;
      if (/^Karten insgesamt: \d+$/.test(line)) continue;

      const isValid =
        currentSection === "pokemonCards"
          ? pokemonPattern.test(line)
          : optionalSetPattern.test(line);

      if (!isValid) {
        errors.push(
          `Invalid format in ${currentSection}. Expected format: ${
            currentSection === "pokemonCards"
              ? "<count> <name> <setId> <setNum>"
              : "<count> <name> [setId setNum]"
          }`
        );
      }

      // Store the valid line
      if (currentSection === "pokemonCards") {
        pokemonCards.push(line);
      } else if (currentSection === "trainerCards") {
        trainerCards.push(line);
      } else if (currentSection === "energyCards") {
        energyCards.push(line);
      }
    }

    const pokemonTokens = pokemonCards.map((card) => this.toCardToken(card));
    const trainerTokens = trainerCards.map((card) => this.toCardToken(card));
    const energyTokens = this.sanitizeEnergyTokens(
      energyCards.map((card) => this.toCardToken(card))
    );

    return {
      deckTokens: {
        pokemonTokens,
        trainerTokens,
        energyTokens,
      },
      errors,
    };
  }

  async check(decklist: string) {
    let errors: Array<string> = [];
    const { deckTokens, errors: parseErrors } = this.parseDeck(decklist);

    if (parseErrors.length > 0) {
      return { isValid: false, errors: parseErrors };
    }

    const cardsInDeck = [
      ...deckTokens.energyTokens,
      ...deckTokens.pokemonTokens,
      ...deckTokens.trainerTokens,
    ].reduce((sum, curr) => {
      return sum + curr.inDeck;
    }, 0);

    // Make sure we still have 60 cards
    if (cardsInDeck != 60) {
      errors.push(`Must be 60 cards in deck, but found ${cardsInDeck}`);
    }
    
    const { cards: pokemonCards, errors: pkmnErrors } =
      await this.getPokemonCards(deckTokens.pokemonTokens);
    const { cards: trainerCards, errors: trainerErrors } =
      await this.getTrainerCards(deckTokens.trainerTokens);
    const { cards: energyCards, errors: energyErrors } =
      await this.getEnergyCards(deckTokens.energyTokens);

    if (pkmnErrors.length > 0) {
      errors = errors.concat(pkmnErrors);
    }
    if (trainerErrors.length > 0) {
      errors = errors.concat(trainerErrors);
    }
    if (energyErrors.length > 0) {
      errors = errors.concat(energyErrors);
    }

    const deck = [...pokemonCards, ...trainerCards, ...energyCards];

    // Make sure no more than 4 per card (except energies)
    const nameCountMap: Record<string, number> = {};
    for (const card of [...pokemonCards, ...trainerCards]) {
      const count = card.inDeck || 0;
      nameCountMap[card.name] = (nameCountMap[card.name] || 0) + count;
    }
    for (const [name, total] of Object.entries(nameCountMap)) {
      if (total > 4) {
        errors.push(
          `Card "${name}" exceeds limit: ${total} copies in deck (max 4 allowed).`
        );
      }
    }

    // Check ace specs
    let aceSpecCount = 0;
    let aceSpecs = new Set();
    let notStandardLegal = new Set();
    deck.forEach((card) => {
      if (card.rarity === "ACE SPEC Rare") {
        aceSpecCount += card.inDeck;
        aceSpecs.add(card.name);
      }
      if (!card.legal?.standard) {
        console.log(card);
        notStandardLegal.add(`${card.name} ${card.set} ${card.setId}`);
      }
    });

    if (aceSpecCount > 1) {
      errors.push(
        `Deck can contain at most 1 ACE SPEC card, but found ${Array.from(
          aceSpecs
        ).join(", ")}`
      );
    }
    if (notStandardLegal.size > 0) {
      errors.push(
        `Deck contains not standard legal cards: ${Array.from(
          notStandardLegal
        ).join(", ")}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  sanitizeEnergyTokens(energyTokens: Array<CardToken>) {
    // map energy names from PTGCL exports to match limitless export format
    const energies = energyTokens.map((item) => {
      let name = item.name;
      if (energyAbbrvMap.hasOwnProperty(name)) {
        name = energyAbbrvMap[name];
      }

      // Handle misspellings and aliases for energies and map them to the correct name
      const energyAliases = Object.keys(energyAliasMap);
      for (const alias of energyAliases) {
        if (name.toLowerCase().includes(alias)) {
          name = energyAliasMap[alias];
          name = energyTypeMapEn[name] || name; // map to english energy name
          break;
        }
      }

      return {
        ...item,
        name: name,
      };
    });

    return energies;
  }

  async getCardByNameAndId(cardToken: CardToken) {
    if (!this.hasSetId(cardToken)) {
      throw new Error("Card Set Info not given.");
    }
    const id = this.buildCardId(cardToken);

    const card = await this.cardRepository.getCardByNameAndId(
      cardToken.name,
      id
    );

    if (!card) {
      throw new Error(
        `Card with name "${cardToken.name}" and set code "${cardToken.set} ${cardToken.setId}" not found.`
      );
    }

    return card;
  }

  async getCardByName(cardToken: CardToken) {
    const card = await this.cardRepository.getCardByName(cardToken.name);

    if (!card) {
      throw new Error(
        `Card with name "${cardToken.name}" and set code "${cardToken.set} ${cardToken.setId}" not found.`
      );
    }

    return card;
  }

  async getPokemonCards(pokemon: Array<CardToken>) {
    const results = (await Promise.allSettled(
      pokemon.map(async (token) => {
        const res = await this.getCardByNameAndId(token);

        return { ...token, legal: res.legal, rarity: res.rarity };
      })
    )) as PromiseSettledResult<CardToken>[];

    return this.buildValidationResponse(results);
  }

  async getTrainerCards(trainers: Array<CardToken>) {
    const results = (await Promise.allSettled(
      trainers.map(async (token) => {
        const res = await this.getCardByName(token);

        return { ...token, legal: res.legal, rarity: res.rarity };
      })
    )) as PromiseSettledResult<CardToken>[];

    return this.buildValidationResponse(results);
  }

  async getEnergyCards(energies: Array<CardToken>) {
    const results = (await Promise.allSettled(
      energies.map(async (token) => {
        const res = await this.getCardByName(token);

        return { ...token, legal: res.legal, rarity: res.rarity };
      })
    )) as PromiseSettledResult<CardToken>[];

    return this.buildValidationResponse(results);
  }

  buildValidationResponse(res: Array<PromiseSettledResult<CardToken>>) {
    const errors: string[] = [];
    const cards: Array<CardToken> = [];

    res.forEach((result) => {
      if (result.status === "fulfilled") {
        cards.push(result.value);
      } else {
        errors.push((result.reason as Error).message);
      }
    });

    return { cards, errors };
  }

  hasSetId(
    token: CardToken
  ): token is CardToken & { setId: number; set: string } {
    return typeof token.setId === "number" && typeof token.set === "string";
  }

  toCardToken(cardString: string): CardToken {
    const parts = cardString.split(" ");

    // Detect <set> <setId> suffix:
    const hasSetInfo =
      parts.length >= 4 &&
      /^[A-Za-z-]{2,5}$/.test(parts[parts.length - 2]) &&
      /^\d{1,3}$/.test(parts[parts.length - 1]);

    const nameParts = parts.slice(1, hasSetInfo ? -2 : undefined);
    const cardName = nameParts.join(" ");

    return {
      inDeck: parseInt(parts[0]),
      name: cardName,
      set: hasSetInfo ? parts[parts.length - 2] : undefined,
      setId: hasSetInfo ? parseInt(parts[parts.length - 1], 10) : undefined,
    };
  }

  buildCardId(cardToken: CardToken & { setId: number; set: string }): string {
    const lowerName = cardToken.set.toLowerCase();
    let setCode: string;
    if (intlToJapaneseSetMap.hasOwnProperty(lowerName)) {
      setCode = intlToJapaneseSetMap[lowerName];
    } else {
      throw new Error(`${cardToken.name}: "${cardToken.set!}" is not a Set!.`);
    }

    const code = setCode.toLowerCase();
    const id = cardToken.setId.toString().padStart(3, "0");
    return `${code}-${id}`;
  }
}

export default PTCGDeckValidator;
