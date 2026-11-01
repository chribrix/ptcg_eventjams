import { formatDateTimeLocalInput } from "~/utils/eventDateTime";
import { parseEventTags, type TagType } from "~/types/eventTags";

export type AdminEventTemplate = {
  id: string;
  name: string;
  eventName?: string | null;
  venue: string;
  tagType: TagType;
  tags: unknown;
  maxParticipants: number;
  participationFee: number | string | null;
  description: string | null;
  requiresDecklist: boolean;
  weekday: number;
  eventTime: string;
  registrationDeadlineMinutesBefore: number | null;
};

const searchable = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();

/** Stable, accent-insensitive search for the compact template picker. */
export function searchEventTemplates(templates: AdminEventTemplate[], query: string): AdminEventTemplate[] {
  const terms = searchable(query).split(/\s+/).filter(Boolean);
  return templates
    .filter((template) => {
      if (!terms.length) return true;
      const parsedTags = parseEventTags(template.tags, template.tagType);
      const tags = parsedTags && typeof parsedTags === "object" ? Object.values(parsedTags).join(" ") : "";
      const haystack = searchable(`${template.name} ${template.eventName || ""} ${template.venue} ${template.tagType} ${tags}`);
      return terms.every((term) => haystack.includes(term));
    })
    .sort((first, second) => first.name.localeCompare(second.name, undefined, { sensitivity: "base" }) || first.id.localeCompare(second.id));
}

/** The selected template fills an editable event draft for its next occurrence. */
export function templateToEventPrefill(template: AdminEventTemplate, timeZone: string, now = new Date()) {
  const [hours, minutes] = template.eventTime.split(":").map(Number);
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);
  let daysUntil = (template.weekday - now.getDay() + 7) % 7;
  if (daysUntil === 0 && next.getTime() <= now.getTime()) daysUntil = 7;
  next.setDate(now.getDate() + daysUntil);

  const registrationDeadline = template.registrationDeadlineMinutesBefore == null
    ? ""
    : formatDateTimeLocalInput(
        new Date(next.getTime() - template.registrationDeadlineMinutesBefore * 60_000),
        timeZone,
      );

  return {
    name: template.eventName || template.name,
    venue: template.venue,
    tagType: template.tagType,
    tags: parseEventTags(template.tags, template.tagType),
    maxParticipants: template.maxParticipants,
    participationFee: Number(template.participationFee || 0),
    description: template.description || "",
    requiresDecklist: template.requiresDecklist,
    eventDate: formatDateTimeLocalInput(next, timeZone),
    registrationDeadline,
  };
}
