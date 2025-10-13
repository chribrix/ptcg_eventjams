import { beforeAll, describe, expect, it } from "vitest";
import PTCGDeckValidator from "../../server/util/PTCGValidator.js";
import { readFileSync } from "fs";
import { setup } from "@nuxt/test-utils/e2e";
import { CardRepository } from "~/server/util/repository/CardRepository.js";

await setup({});
describe.skip("PTCGDeckValidator", () => {
  let validator: PTCGDeckValidator;

  beforeAll(async () => {
    const cardRepository = new CardRepository();
    await cardRepository.init();

    validator = new PTCGDeckValidator(cardRepository);
  });

  it("should accept pultzard (limitless export) in standard format >=G", async () => {
    const list = readFileSync(
      "./tests/data/decklists/limitless_pultzard_valid.txt",
      "utf-8"
    );
    const result = await validator.check(list);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should accept zoroark (limitless export) in standard format >=G", async () => {
    const list = readFileSync(
      "./tests/data/decklists/limitless_zoroark_valid.txt",
      "utf-8"
    );
    const result = await validator.check(list);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should reject malformed zoroark decklist with precise error messages", async () => {
    const list = readFileSync(
      "./tests/data/decklists/limitless_zoroark_invalid.txt",
      "utf-8"
    );
    const result = await validator.check(list);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Must be 60 cards in deck, but found 61");
    expect(result.errors).toContain(
      'Card with name "Fezandipiti ex" and set code "SFA 99" not found.'
    );
    expect(result.errors).toContain(
      'Card "N\'s Zoroark ex" exceeds limit: 5 copies in deck (max 4 allowed).'
    );
  });
});
