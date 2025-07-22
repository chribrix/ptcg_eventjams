import { defineEventHandler } from "#imports";
import PTCGDeckValidator from "../util/PTCGValidator.js";
export default defineEventHandler(async (event) => {
    const requestMethod = event.req.method;

    const repo = useNitroApp().cardRepository

    await repo.hello();

    if (requestMethod !== "POST") {
        return {
            statusCode: 405,
            body: { message: "Method Not Allowed" },
        };
    }


    console.log("Validation endpoint hit");

    const data = await readBody(event);

    // send data to validator
    const validator = new PTCGDeckValidator();
    const result = await validator.check(data.decklist);


    return {
        result
    };
});
