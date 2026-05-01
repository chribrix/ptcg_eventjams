import { PrismaClient } from "@prisma/client";
import { defineAdminRoute } from "~/server/services/admin/adminRoute";

const prisma = new PrismaClient();

type EventHistoryParticipantResult = {
  playerId: string;
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
  customParticipants: EventHistoryParticipantResult[];
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
            },
            orderBy: [
              {},
              {
                registeredAt: "asc",
              },
            ],
          },
          customParticipants: {
            include: {
              player: {
                select: {
                  id: true,
                  name: true,
                  playerId: true,
                },
              },
            },
            orderBy: {
              placement: "asc",
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
        totalParticipants: customEvent._count.registrations,
        participants: customEvent.registrations.map((registration) => {
          const participantResult = customEvent.customParticipants.find(
            (participant) => participant.playerId === registration.playerId,
          );

          return {
            id: registration.id,
            status: registration.status,
            placement: participantResult?.placement,
            points: participantResult?.points,
            registeredAt: registration.registeredAt.toISOString(),
            player: registration.player,
          };
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
