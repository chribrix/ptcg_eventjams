const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function debugRegistrations() {
  try {
    console.log("=== DEBUGGING REGISTRATION ISSUE ===\n");

    // Find all players
    const players = await prisma.player.findMany({
      select: {
        id: true,
        playerId: true,
        name: true,
        email: true,
        _count: {
          select: {
            registrations: true,
          },
        },
      },
    });

    console.log("ALL PLAYERS:");
    players.forEach((player) => {
      console.log(`- Player DB ID: ${player.id}`);
      console.log(`  Player ID: ${player.playerId}`);
      console.log(`  Name: ${player.name}`);
      console.log(`  Email: ${player.email}`);
      console.log(`  Registrations: ${player._count.registrations}\n`);
    });

    // Find all registrations with full details
    const registrations = await prisma.eventRegistration.findMany({
      include: {
        player: {
          select: {
            id: true,
            playerId: true,
            name: true,
            email: true,
          },
        },
        customEvent: {
          select: {
            id: true,
            name: true,
            eventDate: true,
          },
        },
      },
      orderBy: {
        registeredAt: "desc",
      },
    });

    console.log("\nALL REGISTRATIONS:");
    registrations.forEach((reg) => {
      console.log(`- Registration ID: ${reg.id}`);
      console.log(`  Event: ${reg.customEvent.name}`);
      console.log(`  Player: ${reg.player.name} (${reg.player.playerId})`);
      console.log(`  Email: ${reg.player.email}`);
      console.log(`  Status: ${reg.status}`);
      console.log(`  Registered: ${reg.registeredAt}\n`);
    });

    // Look for duplicate player IDs
    const duplicatePlayerIds = await prisma.player.groupBy({
      by: ["playerId"],
      having: {
        playerId: {
          _count: {
            gt: 1,
          },
        },
      },
    });

    if (duplicatePlayerIds.length > 0) {
      console.log("\n🚨 DUPLICATE PLAYER IDS FOUND:");
      for (const dup of duplicatePlayerIds) {
        const dupPlayers = await prisma.player.findMany({
          where: { playerId: dup.playerId },
        });
        console.log(`Player ID "${dup.playerId}" used by:`);
        dupPlayers.forEach((p) => {
          console.log(`  - DB ID: ${p.id}, Name: ${p.name}, Email: ${p.email}`);
        });
        console.log("");
      }
    }

    // Look for duplicate emails
    const duplicateEmails = await prisma.player.groupBy({
      by: ["email"],
      having: {
        email: {
          _count: {
            gt: 1,
          },
        },
      },
    });

    if (duplicateEmails.length > 0) {
      console.log("\n🚨 DUPLICATE EMAILS FOUND:");
      for (const dup of duplicateEmails) {
        if (dup.email) {
          const dupPlayers = await prisma.player.findMany({
            where: { email: dup.email },
          });
          console.log(`Email "${dup.email}" used by:`);
          dupPlayers.forEach((p) => {
            console.log(
              `  - DB ID: ${p.id}, Player ID: ${p.playerId}, Name: ${p.name}`
            );
          });
          console.log("");
        }
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugRegistrations();
