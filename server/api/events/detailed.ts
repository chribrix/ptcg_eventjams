import { defineEventHandler } from "h3";
import { readFileSync } from "node:fs";
import { join } from "node:path";

interface ParsedEvent {
  id: string;
  title: string;
  dateTime: string;
  type: string;
  venue: string;
  location: string;
  country: string;
  link: string;
  icon?: string;
}

export default defineEventHandler(async (): Promise<ParsedEvent[]> => {
  try {
    // Read the parsed events JSON file
    const filePath = join(process.cwd(), "out", "events.json");
    const fileContent = readFileSync(filePath, "utf-8");
    const events: ParsedEvent[] = JSON.parse(fileContent);

    return events;
  } catch (error) {
    console.error("Error reading detailed events:", error);
    return [];
  }
});
