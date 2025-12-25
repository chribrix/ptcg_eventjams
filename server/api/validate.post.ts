import { defineEventHandler } from "#imports";
import PTCGDeckValidator from "../util/PTCGValidator.js";
import { logError, logDatabaseError } from "~/server/util/errorLogger";

export default defineEventHandler(async (event) => {
  try {
    const cardRepo = useNitroApp().cardRepository;
    if (!cardRepo) {
      await logError(
        event,
        "validate_deck_no_card_repo",
        "Card repository not initialized"
      );
      return {
        statusCode: 500,
        body: { message: "Card repository not initialized" },
      };
    }

    const data = await readBody(event);

    console.info("Validating decklist:", data.decklist);
    const validator = new PTCGDeckValidator(cardRepo);
    const result = await validator.check(data.decklist);

    return {
      statusCode: 200,
      body: result,
    };
  } catch (error) {
    console.error("Deck validation error:", error);
    await logDatabaseError(event, error as Error, "validate_deck");
    return {
      statusCode: 500,
      body: { message: "Failed to validate deck", error: String(error) },
    };
  }
});
