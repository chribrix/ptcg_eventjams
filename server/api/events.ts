import { defineEventHandler } from "h3";
import puppeteer from "puppeteer";
import { JSDOM } from "jsdom";

const eventTypes = ["external", "cup", "local"] as const;
type EventType = (typeof eventTypes)[number];

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

interface CalendarEvent {
  id: number;
  title: string;
  start: string; // ISO format e.g. 2025-08-10
  end?: string;
  type: "external" | "cup" | "local" | "challenge";
}

function stripHtmlTags(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

function decodeHtmlEntities(text: string): string {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseEventsFromHtml(html: string): ParsedEvent[] {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Find the grid canvas element
  const gridCanvas = document.querySelector(
    ".grid-canvas.grid-canvas-top.grid-canvas-left"
  );
  if (!gridCanvas) {
    console.warn("Grid canvas not found");
    return [];
  }

  const events: ParsedEvent[] = [];
  const rows = gridCanvas.querySelectorAll(".slick-row");

  rows.forEach((row: Element, index: number) => {
    const eventLink = row.querySelector(".eventlink");
    if (!eventLink) return;

    const href = eventLink.getAttribute("href");
    if (!href || href === "//") return;

    const eventContent = eventLink.querySelector("div");
    if (!eventContent) return;

    const textContent = eventContent.innerHTML;

    // Extract the bold title (datetime and event type)
    const boldMatch = textContent.match(/<b>([^<]+)<\/b>/);
    const title = boldMatch ? boldMatch[1].trim() : "";

    // Parse datetime and event type from title (format: "2025-08-30 12:00 - TCG Friendly")
    const dateTimeMatch = title.match(/^(.+?) - (.+)$/);
    const dateTime = dateTimeMatch ? dateTimeMatch[1].trim() : "";
    const eventType = dateTimeMatch ? dateTimeMatch[2].trim() : "";

    // Extract venue, city, and country from the remaining text
    const textAfterBold = textContent.replace(/<b>[^<]+<\/b><br\s*\/?>/, "");
    const lines = textAfterBold
      .split(/<br\s*\/?>/)
      .map((line: string) => stripHtmlTags(decodeHtmlEntities(line.trim())))
      .filter((line) => line.length > 0);

    let venue = "";
    let location = "";
    let country = "";

    // Parse according to the HTML structure:
    // Line 0: @ VENUE_NAME
    // Line 1: City - Region
    // Line 2: Country
    if (lines.length >= 1) {
      // First line after bold: venue name with "@" prefix
      venue = lines[0].replace(/^@\s*/, "").trim(); // Remove "@ " prefix
    }

    if (lines.length >= 2) {
      // Second line: city and region, keep only city (everything before "-")
      const cityRegion = lines[1];
      const cityMatch = cityRegion.split(" - ")[0]; // Take everything before " - "
      location = cityMatch.trim();
    }

    if (lines.length >= 3) {
      // Third line: country
      country = lines[2].trim();
    }

    // Extract icon if present
    const iconImg = row.querySelector(".slick-cell img");
    let icon = "";
    if (iconImg) {
      const src = iconImg.getAttribute("src");
      if (src) {
        icon = src.split("/").pop()?.replace(".png", "") || "";
      }
    }

    // Extract ID from URL
    const urlParts = href.split("/");
    const id = urlParts[urlParts.length - 2] || `event-${index}`;

    const event: ParsedEvent = {
      id,
      title,
      dateTime,
      type: eventType,
      venue,
      location,
      country,
      link: href,
      ...(icon && { icon }),
    };

    events.push(event);
  });

  return events;
}

function convertToCalendarEvents(parsedEvents: ParsedEvent[]): CalendarEvent[] {
  return parsedEvents.map((event, index) => {
    // The dateTime is in format "YYYY-MM-DD HH:MM"
    let start = new Date().toISOString().split("T")[0]; // fallback to today

    if (event.dateTime) {
      const datePart = event.dateTime.split(" ")[0];

      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        const date = new Date(datePart + "T00:00:00");
        // Check if the date is valid
        if (!isNaN(date.getTime())) {
          start = datePart; // Use the date part directly as it's already in ISO format
        }
      }
    }

    // Map event types based on the event type string
    let type: CalendarEvent["type"] = "local";
    const eventTypeStr = event.type.toLowerCase();

    if (eventTypeStr.includes("challenge")) {
      type = "challenge";
    } else if (
      eventTypeStr.includes("cup") ||
      eventTypeStr.includes("tournament")
    ) {
      type = "cup";
    } else if (eventTypeStr.includes("championship")) {
      type = "external";
    }

    return {
      id: index + 1,
      title: `${event.type}${
        event.venue && event.location
          ? ` @ ${event.venue} - ${event.location}`
          : event.venue
          ? ` @ ${event.venue}`
          : event.location
          ? ` @ ${event.location}`
          : ""
      }`,
      start,
      type,
    };
  });
}

export default defineEventHandler(async () => {
  const browser = await puppeteer.launch();

  try {
    // Yay cookie based search params
    await browser.setCookie(
      {
        name: "country",
        value: "DE",
        domain: "pokedata.ovh",
      },
      {
        name: "states",
        value: '["Bayern"]',
        domain: "pokedata.ovh",
      }
    );

    const page = await browser.newPage();
    await page.goto("https://pokedata.ovh/events");

    await page.evaluate(() => {
      // @ts-expect-error refresh page with cookie search params
      return search();
    });

    await page.waitForSelector(".ui-widget-content", { timeout: 5000 });

    const pageContent = await page.content();
    const events = parseEventsFromHtml(pageContent);
    const calendarEvents = convertToCalendarEvents(events);

    await browser.close();

    return calendarEvents;
  } catch (error) {
    await browser.close();
    console.error("Error scraping events:", error);

    return [];
  }
});
