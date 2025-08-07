// server/api/events.get.ts
import { defineEventHandler } from "h3";

const eventTypes = ["external", "cup", "local"] as const;
type EventType = (typeof eventTypes)[number];

const generateMockEvents = (): any[] => {
  const today = new Date();
  const events = [];

  for (let i = 0; i < 10; i++) {
    const daysFromNow = Math.floor(Math.random() * 60); // within 2 months
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + daysFromNow);

    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    events.push({
      id: i + 1,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Event #${i + 1}`,
      start: startDate.toISOString().split("T")[0], // format: YYYY-MM-DD
      type,
    });
  }

  return events;
};

export default defineEventHandler(() => {
  return generateMockEvents();
});
