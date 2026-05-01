import { PrismaClient } from "@prisma/client";
import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { countRegistrationTickets } from "~/server/services/events/eventProjectionService";

const prisma = new PrismaClient();

type EventHistoryTicket = {
  id: string;
  participantName: string;
  participantPlayerId: string | null;
  status: string;
  placement: number | null;
  points: number | null;
};

type EventHistoryRegistration = {
  id: string;
  status: string;
  playerId: string;
  registeredAt: Date;
  player: {
    id: string;
    name: string;
    playerId: string;
  };
  tickets: EventHistoryTicket[];
};

type EventHistoryEvent = {
  id: string;
  name: string;
  venue: string;
  eventDate: Date;
  participationFee: { toString(): string } | null;
  description: string | null;
  status: string;
  requiresDecklist: boolean;
  _count: {
    registrations: number;
  };
  registrations: EventHistoryRegistration[];
};

type EventHistoryDependencies = {
  getRequestMethod?: (event: unknown) => string;
  findPastEvents?: () => Promise<EventHistoryEvent[]>;
};

export function createAdminEventHistoryHandler(
  dependencies: EventHistoryDependencies = {},
) {
  const {
    getRequestMethod = (event) =>
      (event as { node: { req: { method?: string } } }).node.req.method ||
      "GET",
    findPastEvents = () =>
      prisma.customEvent.findMany({
        where: {
          eventDate: {
            lt: new Date(),
          },
        },
        include: {
          _count: {
            select: {
              registrations: true,
            },
          },
          registrations: {
            include: {
              player: {
                select: {
                  id: true,
                  name: true,
                  playerId: true,
                },
              },
              tickets: {
                select: {
                  id: true,
                  participantName: true,
                  participantPlayerId: true,
                  status: true,
                  placement: true,
                  points: true,
                },
                orderBy: [
                  {
                    placement: "asc",
                  },
                  {
                    createdAt: "asc",
                  },
                ],
              },
            },
            orderBy: {
              registeredAt: "asc",
            },
          },
        },
        orderBy: {
          eventDate: "desc",
        },
      }),
  } = dependencies;

  return async ({ event }: { event: unknown }) => {
    if (getRequestMethod(event) !== "GET") {
      throw createError({
        statusCode: 405,
        statusMessage: "Method not allowed",
      });
    }

    try {
      const pastEvents = await findPastEvents();

      const eventHistory = pastEvents.map((customEvent) => ({
        id: customEvent.id,
        name: customEvent.name,
        venue: customEvent.venue,
        eventDate: customEvent.eventDate.toISOString(),
        participationFee: customEvent.participationFee?.toString(),
        description: customEvent.description,
        status: customEvent.status,
        requiresDecklist: customEvent.requiresDecklist,
        totalParticipants: countRegistrationTickets(customEvent.registrations),
        participants: customEvent.registrations.flatMap((registration) => {
          const tickets = registration.tickets.length
            ? registration.tickets
            : [
                {
                  id: registration.id,
                  participantName: registration.player.name,
                  participantPlayerId: registration.player.playerId,
                  status: registration.status,
                  placement: null,
                  points: null,
                },
              ];

          return tickets.map((ticket) => ({
            id: ticket.id,
            status: ticket.status,
            placement: ticket.placement ?? undefined,
            points: ticket.points ?? undefined,
            registeredAt: registration.registeredAt.toISOString(),
            player: {
              id: registration.player.id,
              name: ticket.participantName || registration.player.name,
              playerId:
                ticket.participantPlayerId || registration.player.playerId,
            },
          }));
        }),
      }));

      return {
        data: eventHistory,
      };
    } catch (error) {
      throw createError({
        statusCode: 500,
        statusMessage:
          "Failed to fetch event history: " +
          (error instanceof Error ? error.message : String(error)),
      });
    }
  };
}

export default defineAdminRoute(createAdminEventHistoryHandler());
