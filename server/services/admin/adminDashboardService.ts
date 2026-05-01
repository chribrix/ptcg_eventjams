import prisma from "~/lib/prisma";

type DashboardActivity = {
  id: string;
  type: string;
  description: string;
  createdAt: string;
};

function formatAdminActionDescription(
  actionType: string,
  metadata: Record<string, unknown> | null | undefined,
) {
  const targetUserId =
    typeof metadata?.targetUserId === "string" ? metadata.targetUserId : null;

  switch (actionType) {
    case "admin_role_granted":
      return `Admin role granted${targetUserId ? ` to ${targetUserId}` : ""}`;
    case "admin_role_removed":
      return `Admin role removed${targetUserId ? ` from ${targetUserId}` : ""}`;
    case "admin_password_reset_requested":
      return `Password reset requested${targetUserId ? ` for ${targetUserId}` : ""}`;
    default:
      return `Admin action: ${actionType}`;
  }
}

export async function getAdminDashboardView() {
  const now = new Date();

  const [
    customEvents,
    playerCount,
    upcomingEvents,
    completedEvents,
    recentEvents,
    recentPlayers,
    recentAdminActions,
  ] = await Promise.all([
    prisma.customEvent.count(),
    prisma.player.count(),
    prisma.customEvent.count({
      where: {
        eventDate: {
          gte: now,
        },
      },
    }),
    prisma.customEvent.count({
      where: {
        eventDate: {
          lt: now,
        },
      },
    }),
    prisma.customEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    }),
    prisma.player.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        name: true,
        playerId: true,
        createdAt: true,
      },
    }),
    prisma.errorLog.findMany({
      where: {
        errorType: {
          startsWith: "admin_",
        },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        errorType: true,
        createdAt: true,
        metadata: true,
      },
    }),
  ]);

  const recentActivity: DashboardActivity[] = [
    ...recentEvents.map((event) => ({
      id: `event-${event.id}`,
      type: "eventCreated",
      description: `Custom event \"${event.name}\" created`,
      createdAt: event.createdAt.toISOString(),
    })),
    ...recentPlayers.map((player) => ({
      id: `player-${player.id}`,
      type: "playerCreated",
      description: `Player \"${player.name}\" (${player.playerId}) created`,
      createdAt: player.createdAt.toISOString(),
    })),
    ...recentAdminActions.map((entry) => ({
      id: `admin-${entry.id}`,
      type: entry.errorType,
      description: formatAdminActionDescription(
        entry.errorType,
        (entry.metadata || null) as Record<string, unknown> | null,
      ),
      createdAt: entry.createdAt.toISOString(),
    })),
  ]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    )
    .slice(0, 8);

  return {
    stats: {
      customEvents,
      totalPlayers: playerCount,
      upcomingEvents,
      completedEvents,
    },
    recentActivity,
  };
}
