docker exec -i ptcg_app node <<'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const userId = '23f05dc2-9aca-4808-aa2e-b04538bdcb2d';
const email = 'chrisbrinker@pm.me';
const name = 'Chris Brinker';
(async () => {
  try {
    const admin = await prisma.adminUser.upsert({
      where: { id: userId },
      update: { email, name },
      create: { id: userId, email, name },
    });
    console.log('Admin user ensured:', admin);
  } catch (err) {
    console.error('Failed to add admin:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
EOF