import { defineEventHandler } from "#imports";
import PTCGDeckValidator from "../util/PTCGValidator.js";
export default defineEventHandler(async (event) => {
  const cardRepo = useNitroApp().cardRepository;
  if (!cardRepo) {
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
});
