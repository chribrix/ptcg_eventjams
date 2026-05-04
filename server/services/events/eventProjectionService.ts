import { parseEventTags } from "~/types/eventTags";
import { getEventTypeFromOverrides } from "~/utils/eventTypes";
import { getDateKeyInTimeZone } from "~/utils/eventDateTime";
import { isDefaultHiddenExternalEvent } from "~/utils/externalEventVisibility";

type TicketCountRegistration = {
  _count?: {
    tickets?: number;
  };
  tickets?: unknown[];
};

type ExternalEventLike = {
  id: string;
  title: string;
  dateTime: string;
  time?: string;
  type: string;
  venue: string;
  location: string;
  country: string;
  link: string;
  cost?: string;
  streetAddress?: string;
  icon?: string;
};

type ExternalEventOverrideLike = {
  id: string;
  eventName: string;
  eventDate: Date | string;
  eventLocation?: string | null;
  overrides: unknown;
  handleRegistrationLocally?: boolean;
  hideFromCalendar?: boolean;
  maxParticipants?: number | null;
  participationFee?: number | null;
  registrationDeadline?: Date | string | null;
  requiresDecklist?: boolean;
  description?: string | null;
  createdBy?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  registrations?: TicketCountRegistration[];
  creator?: unknown;
  tagType?: string | null;
  tags?: unknown;
};

type AdminCustomEventLike = {
  tags?: unknown;
  tagType: string;
  registrations: TicketCountRegistration[];
};

function normalizeOverrideData(overrides: unknown) {
  return overrides && typeof overrides === "object" && !Array.isArray(overrides)
    ? (overrides as Record<string, unknown>)
    : {};
}

function toDateKey(value: Date | string) {
  return getDateKeyInTimeZone(value);
}

export function countRegistrationTickets(
  registrations: TicketCountRegistration[] = [],
) {
  return registrations.reduce((sum, registration) => {
    if (typeof registration._count?.tickets === "number") {
      return sum + registration._count.tickets;
    }

    if (Array.isArray(registration.tickets)) {
      return sum + registration.tickets.length;
    }

    return sum;
  }, 0);
}

export function projectEventTypeFromTags(
  tags: unknown,
  tagType: string | null | undefined,
  fallback = "custom",
) {
  if (!tags || !tagType) {
    return fallback;
  }

  try {
    return parseEventTags(tags, tagType as never).type || fallback;
  } catch {
    return fallback;
  }
}

export function applyExternalEventOverridesToFeed(
  events: ExternalEventLike[],
  overrides: ExternalEventOverrideLike[],
  options: { includeHidden?: boolean } = {},
) {
  return events
    .map((event) => {
      const override = overrides.find((entry) => {
        const nameMatch =
          event.venue.toLowerCase().trim() ===
          entry.eventName.toLowerCase().trim();
        const dateMatch =
          toDateKey(event.dateTime) === toDateKey(entry.eventDate);
        const locationMatch =
          !entry.eventLocation ||
          event.location
            .toLowerCase()
            .includes(entry.eventLocation.toLowerCase());

        return nameMatch && dateMatch && locationMatch;
      });

      const defaultHidden = isDefaultHiddenExternalEvent({
        venue: event.venue,
        streetAddress: event.streetAddress,
      });

      if (!override) {
        return {
          ...event,
          hideFromCalendar: defaultHidden,
        } as ExternalEventLike & { hideFromCalendar: boolean };
      }

      const overrideData = normalizeOverrideData(override.overrides);
      const overriddenEvent = {
        ...event,
        ...overrideData,
        type:
          typeof overrideData.type === "string"
            ? overrideData.type
            : event.type,
        icon:
          typeof overrideData.icon === "string"
            ? overrideData.icon
            : event.icon,
        isOverridden: true,
        hideFromCalendar:
          override.hideFromCalendar !== undefined
            ? override.hideFromCalendar === true
            : defaultHidden,
      } as ExternalEventLike & {
        isOverridden: boolean;
        hideFromCalendar: boolean;
        hasLocalRegistration?: boolean;
      };

      if (override.handleRegistrationLocally) {
        overriddenEvent.id = override.id;
        overriddenEvent.link = `/events/register/${override.id}`;
        overriddenEvent.hasLocalRegistration = true;
      }

      return overriddenEvent;
    })
    .filter(
      (event) =>
        options.includeHidden === true ||
        (event as { hideFromCalendar?: boolean }).hideFromCalendar !== true,
    );
}

export function projectAdminCustomEvent(event: AdminCustomEventLike) {
  return {
    ...event,
    isExternalEvent: false,
    eventType: projectEventTypeFromTags(event.tags, event.tagType),
    _count: {
      registrations: countRegistrationTickets(event.registrations),
    },
  };
}

export function projectAdminExternalOverrideEvent(
  event: ExternalEventOverrideLike,
) {
  const overrideData = normalizeOverrideData(event.overrides);
  const parsedType = projectEventTypeFromTags(
    event.tags || overrideData.tags,
    event.tags ? event.tagType || "pokemon" : "pokemon",
    getEventTypeFromOverrides(overrideData),
  );

  return {
    id: event.id,
    name:
      (overrideData.title as string | undefined) ||
      (overrideData.venue as string | undefined) ||
      event.eventName,
    venue:
      (overrideData.venue as string | undefined) ||
      event.eventLocation ||
      event.eventName,
    maxParticipants: event.maxParticipants || 0,
    participationFee: event.participationFee || 0,
    description: event.description,
    eventDate: event.eventDate,
    registrationDeadline: event.registrationDeadline,
    status: new Date(event.eventDate) > new Date() ? "upcoming" : "completed",
    requiresDecklist: event.requiresDecklist,
    createdBy: event.createdBy,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    registrations: event.registrations,
    creator: event.creator,
    isExternalEvent: true,
    tagType: event.tagType || "pokemon",
    tags: event.tags || overrideData.tags || { game: "Pokemon" },
    eventType: parsedType,
    originalEventName: event.eventName,
    originalEventDate: event.eventDate,
    _count: {
      registrations: countRegistrationTickets(event.registrations),
    },
  };
}

export function projectPublicEventDetailsFromOverride(
  event: ExternalEventOverrideLike,
  registrationCount: number,
) {
  const overrideData = normalizeOverrideData(event.overrides);

  return {
    event: {
      id: event.id,
      name:
        (overrideData.title as string | undefined) ||
        (overrideData.venue as string | undefined) ||
        event.eventName,
      venue:
        (overrideData.venue as string | undefined) ||
        event.eventLocation ||
        event.eventName,
      eventDate: event.eventDate,
      maxParticipants: event.maxParticipants || 0,
      participationFee: event.participationFee,
      description: event.description,
      registrationDeadline: event.registrationDeadline,
      requiresDecklist: event.requiresDecklist,
      status: "published",
      createdBy: event.createdBy,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      isExternalEvent: true,
      eventType: getEventTypeFromOverrides(overrideData),
    },
    registrationCount,
  };
}
