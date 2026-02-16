import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LEVEL_THRESHOLDS = [
  { level: 1, minXp: 0 },
  { level: 2, minXp: 100 },
  { level: 3, minXp: 300 },
  { level: 4, minXp: 600 },
  { level: 5, minXp: 1000 },
  { level: 6, minXp: 2000 },
  { level: 7, minXp: 3500 },
  { level: 8, minXp: 5500 },
  { level: 9, minXp: 8000 },
  { level: 10, minXp: 12000 },
];

function calculateLevel(xp: number): number {
  let level = 1;
  for (const l of LEVEL_THRESHOLDS) {
    if (xp >= l.minXp) level = l.level;
  }
  return level;
}

async function main() {
  console.log('Starting XP recalculation for all users...');

  const users = await prisma.user.findMany({
    include: {
      achievements: {
        include: { achievement: true },
      },
    },
  });

  console.log(`Found ${users.length} users`);

  let updated = 0;

  for (const user of users) {
    const totalXp = user.achievements.reduce(
      (sum, ua) => sum + (ua.achievement.xpReward || 0),
      0,
    );

    const newLevel = calculateLevel(totalXp);

    // Update User model xp/level
    await prisma.user.update({
      where: { id: user.id },
      data: { xp: totalXp, level: newLevel },
    });

    // Also sync UserLevel table
    await prisma.userLevel.upsert({
      where: { userId: user.id },
      create: { userId: user.id, xp: totalXp, totalXp, level: newLevel },
      update: { xp: totalXp, totalXp, level: newLevel },
    });

    console.log(
      `User ${user.firstName || user.id}: XP=${totalXp}, Level=${newLevel} (${user.achievements.length} achievements)`,
    );
    updated++;
  }

  console.log(`\nDone! Updated ${updated} users.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
