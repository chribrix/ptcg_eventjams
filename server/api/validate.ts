import { defineEventHandler } from "#imports";
import PTCGDeckValidator from "../util/PTCGValidator.js";
export default defineEventHandler(async (event) => {
  const requestMethod = event.req.method;

  const repo = useNitroApp().cardRepository;
  if (!repo) {
    return {
      statusCode: 500,
      body: { message: "Card repository not initialized" },
    };
  }

  // TODO is there something like a prehandler for this?
  if (requestMethod !== "POST") {
    return {
      statusCode: 405,
      body: { message: "Method Not Allowed" },
    };
  }

  const data = await readBody(event);

  const validator = new PTCGDeckValidator();
  const result = await validator.check(data.decklist);

  return {
    statusCode: 200,
    body: result,
  };
});
