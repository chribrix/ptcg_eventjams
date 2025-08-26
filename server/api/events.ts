import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

interface ParsedEvent {
  id: string;
  title: string;
  dateTime: string;
  type: string;
  venue: string;
  location: string;
  country: string;
  link: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  dateTime: string;
  type: string;
  venue: string;
  location: string;
  country: string;
  link: string;
  icon: string;
}

function parseEventsFromHtml(html: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];

  // Match all event links and their content
  const eventRegex =
    /<a[^>]*class="eventlink"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>[\s\S]*?<\/a>/g;
  let match;

  while ((match = eventRegex.exec(html)) !== null) {
    const href = match[1];
    const content = match[2];

    if (!href || href === "//") continue;

    // Extract event details from the content
    const dateTimeMatch = content.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2})/);
    const typeMatch = content.match(
      /- (TCG [^@]*|VG [^@]*|GO [^@]*|Pre Release)/
    );
    const venueMatch = content.match(/@\s*([^<\n]*?)(?:<br|$)/);
    const locationMatch = content.match(
      /(?:<br\s*\/?>|<\/br>)\s*([^<\n]*?)\s*-\s*([A-Z]{2})\s*(?:<|$)/
    );

    if (dateTimeMatch && typeMatch && venueMatch) {
      const dateTime = dateTimeMatch[1];
      const type = typeMatch[1].trim();
      const venue = venueMatch[1].trim();
      const location = locationMatch ? locationMatch[1].trim() : "";
      const country = locationMatch ? locationMatch[2] : "DE";

      // Extract event ID from href
      const idMatch = href.match(/\/([^\/]+)\/?$/);
      const id = idMatch
        ? idMatch[1]
        : `${dateTime}-${venue}`.replace(/[^a-zA-Z0-9-]/g, "-");

      events.push({
        id,
        title: `${dateTime} - ${type}`,
        dateTime,
        type,
        venue,
        location,
        country,
        link: href.startsWith("http")
          ? href
          : `https://www.pokemon.com/us/pokemon-trainer-club/play-pokemon-tournaments${href}`,
      });
    }
  }

  return events;
}

function convertToCalendarEvents(parsedEvents: ParsedEvent[]): CalendarEvent[] {
  return parsedEvents.map((event) => {
    let icon = "friendly";
    if (event.type.toLowerCase().includes("cup")) icon = "cup";
    else if (event.type.toLowerCase().includes("challenge")) icon = "chall";
    else if (event.type.toLowerCase().includes("pre release")) icon = "pre";

    return {
      ...event,
      icon,
    };
  });
}

function createEventResponse(
  calendarEvents: CalendarEvent[],
  totalFound: number
) {
  // Save events to out folder
  const outDir = path.join(process.cwd(), "out");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const eventsPath = path.join(outDir, "events.json");
  fs.writeFileSync(eventsPath, JSON.stringify(calendarEvents, null, 2));

  const rawEventsPath = path.join(outDir, "events-raw.json");
  fs.writeFileSync(rawEventsPath, JSON.stringify(calendarEvents, null, 2));

  console.log("Events saved to files");

  // Convert CalendarEvents to the format expected by the calendar component
  const calendarFormatEvents = calendarEvents.map((event) => {
    // Extract date from dateTime (YYYY-MM-DD HH:MM -> YYYY-MM-DD)
    const dateOnly = event.dateTime.split(" ")[0];

    // Map our event types to calendar types
    let calendarType: "external" | "cup" | "local" | "challenge" = "local";
    if (event.type.toLowerCase().includes("cup")) {
      calendarType = "cup";
    } else if (event.type.toLowerCase().includes("challenge")) {
      calendarType = "challenge";
    } else if (event.type.toLowerCase().includes("friendly")) {
      calendarType = "local";
    } else {
      calendarType = "external";
    }

    return {
      id: parseInt(event.id.replace(/[^0-9]/g, "")) || Math.random() * 10000,
      title: event.title,
      start: dateOnly,
      type: calendarType,
    };
  });

  return calendarFormatEvents;
}

export default defineEventHandler(async () => {
  console.log("Starting event scraping...");
  const browser = await puppeteer.launch();

  try {
    // Cookie based search params - Bayern only
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

    console.log("Collecting all events by simple scroll-to-bottom approach...");

    const allEventsData = await page.evaluate(async () => {
      // First, let's inspect what we're working with
      const viewport = document.querySelector(".slick-viewport") as HTMLElement;
      const canvas = document.querySelector(".grid-canvas") as HTMLElement;

      if (!viewport || !canvas) {
        return { success: false, error: "Grid elements not found" };
      }

      // Try to access SlickGrid data directly first
      let slickGridData = null;
      try {
        // SlickGrid usually exposes data through window or grid instances
        const gridElements = document.querySelectorAll('[id*="grid"]');
        for (const element of gridElements) {
          const elementId = element.id;
          if (
            (window as any)[elementId] &&
            (window as any)[elementId].getData
          ) {
            slickGridData = (window as any)[elementId].getData();
            console.log(
              `Found SlickGrid data via ${elementId}:`,
              slickGridData.length,
              "items"
            );
            break;
          }
        }
      } catch (e) {
        console.log("Could not access SlickGrid data directly:", e);
      }

      const allEvents: Array<{
        href: string;
        content: string;
        dateStr: string;
      }> = [];

      // Helper function to collect events from current view
      const collectCurrentEvents = () => {
        const currentRows = document.querySelectorAll(".slick-row");
        let newEventsCount = 0;

        currentRows.forEach((row) => {
          const eventLink = row.querySelector(".eventlink");
          if (eventLink) {
            const href = eventLink.getAttribute("href");
            if (
              href &&
              href !== "//" &&
              !allEvents.find((e) => e.href === href)
            ) {
              const eventContent = eventLink.querySelector("div");
              if (eventContent) {
                const dateMatch =
                  eventContent.innerHTML.match(/(\d{4}-\d{2}-\d{2})/);
                const dateStr = dateMatch ? dateMatch[0] : "9999-12-31";

                allEvents.push({
                  href: href,
                  content: eventContent.innerHTML,
                  dateStr: dateStr,
                });

                newEventsCount++;
              }
            }
          }
        });

        return newEventsCount;
      };

      // If we have direct access to SlickGrid data, use it
      if (slickGridData && slickGridData.length > 20) {
        console.log("Using direct SlickGrid data access");

        // Extract events from SlickGrid data
        slickGridData.forEach((item: any, index: number) => {
          if (item.link && item.link !== "//") {
            const dateStr = item.dateTime || item.date || "9999-12-31";
            allEvents.push({
              href: item.link,
              content: `${item.dateTime || ""} - ${item.type || ""} @ ${
                item.venue || ""
              }<br>${item.location || ""}`,
              dateStr: dateStr,
            });
          }
        });

        console.log(`Collected ${allEvents.length} events from SlickGrid data`);
      } else {
        // Fall back to simple 2-strategy scrolling approach with large steps
        console.log("Using 2-strategy scrolling with large step sizes");

        // Get all measurements
        const canvasHeight = parseInt((canvas as any).style.height) || 0;
        const viewportHeight = viewport.clientHeight || 500;
        
        console.log(
          `Measurements: Canvas=${canvasHeight}px, Viewport=${viewportHeight}px`
        );

        // Strategy 1: Large step scrolling to cover maximum ground quickly
        console.log("Strategy 1: Large step scrolling");
        const largeStep = 2000; // 2000px steps - much larger!
        const maxScrollHeight = 100000; // Scroll up to 100k pixels to ensure we get everything
        
        for (let pos = 0; pos <= maxScrollHeight; pos += largeStep) {
          viewport.scrollTop = pos;
          await new Promise((resolve) => setTimeout(resolve, 300)); // Wait for rendering
          collectCurrentEvents();
          
          // Log progress every 10000px
          if (pos % 10000 === 0) {
            console.log(`Large step scroll to ${pos}px: found ${allEvents.length} events total`);
          }
        }

        console.log(`After strategy 1: ${allEvents.length} events`);

        // Strategy 2: Jump to specific large positions to catch any missed sections
        console.log("Strategy 2: Large position jumping");
        const jumpPositions = [
          0, 5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000,
          60000, 70000, 80000, 90000, 100000, 120000, 150000, 200000
        ];
        
        for (const pos of jumpPositions) {
          viewport.scrollTop = pos;
          await new Promise((resolve) => setTimeout(resolve, 500)); // Longer wait for large jumps
          collectCurrentEvents();
          
          console.log(`Jump to ${pos}px: total events = ${allEvents.length}`);
        }

        console.log(`After strategy 2: ${allEvents.length} events`);
      }

      // Sort events by date to ensure chronological order
      allEvents.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

      console.log(`FINAL RESULT: ${allEvents.length} unique events collected`);
      if (allEvents.length > 0) {
        console.log(
          `Date range: ${allEvents[0].dateStr} to ${
            allEvents[allEvents.length - 1].dateStr
          }`
        );
      }

      if (allEvents.length < 25) {
        console.log(
          `WARNING: Only found ${allEvents.length} events, expected 30+`
        );
        console.log("Canvas info:", {
          canvasHeight: parseInt((canvas as any).style.height) || 0,
          viewportHeight: viewport.clientHeight,
          scrollHeight: viewport.scrollHeight,
          totalRows: document.querySelectorAll(".slick-row").length,
          visibleRows: document.querySelectorAll(
            '.slick-row:not([style*="display: none"])'
          ).length,
        });
      }

      return {
        success: true,
        count: allEvents.length,
        data: allEvents,
        method: "two_strategy_large_steps",
      };
    });

    if (!allEventsData.success) {
      throw new Error(allEventsData.error || "Failed to collect events");
    }

    console.log(
      `SUCCESS: Found ${allEventsData.count} events using ${allEventsData.method}`
    );

    // Convert the collected event data to HTML-like format for parsing
    const htmlContent = (allEventsData.data || [])
      .map(
        (event: any) =>
          `<a class="eventlink" href="${event.href}"><div>${event.content}</div></a>`
      )
      .join("\n");

    const events = parseEventsFromHtml(htmlContent);
    console.log(`Parsed ${events.length} events`);

    // Remove duplicates by ID and datetime+venue combination
    const uniqueEvents = events.filter((event, index, self) => {
      const duplicateById = self.findIndex((e) => e.id === event.id) === index;
      const key = `${event.dateTime}-${event.venue}`;
      const duplicateByKey =
        self.findIndex((e) => `${e.dateTime}-${e.venue}` === key) === index;
      return duplicateById && duplicateByKey;
    });

    console.log(`After removing duplicates: ${uniqueEvents.length} events`);

    const calendarEvents = convertToCalendarEvents(uniqueEvents);
    console.log(`Converted to ${calendarEvents.length} calendar events`);

    await browser.close();
    return createEventResponse(calendarEvents, allEventsData.count || 0);
  } catch (error: any) {
    console.error("Error scraping events:", error);
    await browser.close();
    return {
      error: "Failed to fetch events",
      details: error?.message || "Unknown error",
    };
  }
});
