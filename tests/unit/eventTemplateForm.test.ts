import { describe, expect, it } from "vitest";
import { searchEventTemplates, templateToEventPrefill, type AdminEventTemplate } from "~/components/events/eventTemplateForm";
import { createEventTemplateInputSchema, updateEventTemplateInputSchema } from "~/server/services/admin/eventTemplateAdminService";

const template: AdminEventTemplate = {
  id: "template-1",
  name: "Freitag im Laden",
  eventName: "Crow's and Owl's Locals",
  venue: "Crows & Owls",
  tagType: "pokemon",
  tags: { game: "Pokemon", type: "local_tournament" },
  maxParticipants: 20,
  participationFee: 5,
  description: "Training",
  requiresDecklist: false,
  weekday: 5,
  eventTime: "18:30",
  registrationDeadlineMinutesBefore: 60,
};

describe("event template form contract", () => {
  it("keeps a custom template label separate from the editable event title", () => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const draft = templateToEventPrefill(template, timeZone, new Date(2026, 10, 1, 10));
    expect(draft.name).toBe("Crow's and Owl's Locals");
    expect(draft.eventDate).toBe("2026-11-06T18:30");
    expect(draft.registrationDeadline).toBe("2026-11-06T17:30");
    expect(draft.venue).toBe("Crows & Owls");
    expect(draft.tags).toEqual(template.tags);
  });

  it("prefills legacy templates using their existing name", () => {
    const draft = templateToEventPrefill({ ...template, eventName: null }, Intl.DateTimeFormat().resolvedOptions().timeZone, new Date(2026, 10, 1, 10));
    expect(draft.name).toBe("Freitag im Laden");
  });

  it("accepts both old payloads and separate template/event names", () => {
    const base = {
      name: " Freitags-Locals ", venue: "Laden", maxParticipants: 20,
      weekday: 5, eventTime: "18:30", requiresDecklist: false,
    };
    expect(createEventTemplateInputSchema.parse(base).eventName).toBeUndefined();
    expect(createEventTemplateInputSchema.parse({ ...base, eventName: " Eventtitel " })).toMatchObject({ name: "Freitags-Locals", eventName: "Eventtitel" });
    expect(updateEventTemplateInputSchema.parse({ name: " Neuer Vorlagenname " }).name).toBe("Neuer Vorlagenname");
    expect(() => createEventTemplateInputSchema.parse({ ...base, name: "   " })).toThrow();
  });

  it("finds templates by custom label, event title and venue independent of case and accents", () => {
    const templates = [
      { ...template, id: "b", name: "Liga-Cup Samstag", eventName: "Crow's and Owl's League Cup" },
      { ...template, id: "a", name: "Prérélease", eventName: "Delta-Herrschaft", venue: "Landshut" },
      { ...template, id: "c", name: "Challenge Freitag", eventName: "Liga Challenge", venue: "München" },
    ];
    expect(searchEventTemplates(templates, "PRErelease").map(({ id }) => id)).toEqual(["a"]);
    expect(searchEventTemplates(templates, "league cup").map(({ id }) => id)).toEqual(["b"]);
    expect(searchEventTemplates(templates, "munchen challenge").map(({ id }) => id)).toEqual(["c"]);
    expect(searchEventTemplates(templates, "").map(({ id }) => id)).toEqual(["c", "b", "a"]);
  });
});
