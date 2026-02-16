import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function count(table: string, col: string, userId: string): Promise<number> {
  const result = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int as cnt FROM "${table}" WHERE "${col}" = $1`,
    userId,
  ) as any[];
  return result[0]?.cnt || 0;
}

async function main() {
  console.log('=== USER DATA ANALYSIS ===\n');

  const users = await prisma.$queryRaw`
    SELECT id, "telegramId", "telegramUsername", "firstName", "lastName",
           roles, status, "tonWalletAddress", "referralCode", xp, level,
           "totalDeals", "successfulDeals", "totalSpent", "totalEarned",
           rating, "reviewCount", "createdAt", "lastActiveAt"
    FROM users ORDER BY "createdAt" ASC
  ` as any[];

  for (const user of users) {
    const channels = await prisma.$queryRawUnsafe(
      `SELECT id, title, username, "telegramId", "subscriberCount" FROM channels WHERE "ownerId" = $1`,
      user.id,
    ) as any[];

    const dealsAdv = await prisma.$queryRawUnsafe(
      `SELECT id, status FROM deals WHERE "advertiserId" = $1`, user.id,
    ) as any[];

    const dealsOwn = await prisma.$queryRawUnsafe(
      `SELECT id, status FROM deals WHERE "channelOwnerId" = $1`, user.id,
    ) as any[];

    // campaigns uses advertiserId not userId
    const campaigns = await prisma.$queryRawUnsafe(
      `SELECT id, title FROM campaigns WHERE "advertiserId" = $1`, user.id,
    ) as any[];

    const transactions = await prisma.$queryRawUnsafe(
      `SELECT id, type, amount FROM transactions WHERE "userId" = $1`, user.id,
    ) as any[];

    const achievements = await prisma.$queryRawUnsafe(
      `SELECT ua.id, a.name FROM user_achievements ua JOIN achievements a ON ua."achievementId" = a.id WHERE ua."userId" = $1`,
      user.id,
    ) as any[];

    const wallets = await prisma.$queryRawUnsafe(
      `SELECT id, address FROM user_wallets WHERE "userId" = $1`, user.id,
    ) as any[];

    const balance = await prisma.$queryRawUnsafe(
      `SELECT * FROM user_balances WHERE "userId" = $1`, user.id,
    ) as any[];

    const userLevel = await prisma.$queryRawUnsafe(
      `SELECT xp, level, "totalXp" FROM user_levels WHERE "userId" = $1`, user.id,
    ) as any[];

    const notifCount = await count('notifications', 'userId', user.id);
    const sessCount = await count('user_sessions', 'userId', user.id);
    const ticketCount = await count('support_tickets', 'userId', user.id);
    const favCount = await count('favorites', 'userId', user.id);
    const filterCount = await count('saved_filters', 'userId', user.id);
    const msgCount = await count('deal_messages', 'senderId', user.id);
    const reviewGiven = await count('reviews', 'authorId', user.id);
    const reviewRecv = await count('reviews', 'recipientId', user.id);
    const timelineCount = await count('deal_timeline', 'actorId', user.id);

    console.log('─'.repeat(70));
    console.log(`USER: ${user.firstName || '(no name)'} ${user.lastName || ''}`);
    console.log(`  ID:              ${user.id}`);
    console.log(`  telegramId:      ${user.telegramId}`);
    console.log(`  username:        @${user.telegramUsername || '(none)'}`);
    console.log(`  roles:           ${user.roles}`);
    console.log(`  status:          ${user.status}`);
    console.log(`  wallet:          ${user.tonWalletAddress || '(none)'}`);
    console.log(`  referralCode:    ${user.referralCode || '(none)'}`);
    console.log(`  xp/level:        ${user.xp} XP / Level ${user.level}`);
    console.log(`  totalDeals:      ${user.totalDeals} (successful: ${user.successfulDeals})`);
    console.log(`  totalSpent:      ${user.totalSpent}`);
    console.log(`  totalEarned:     ${user.totalEarned}`);
    console.log(`  rating:          ${user.rating} (${user.reviewCount} reviews)`);
    console.log(`  created:         ${user.createdAt}`);
    console.log(`  lastActive:      ${user.lastActiveAt}`);
    console.log('');
    console.log(`  OWNED DATA:`);
    console.log(`    Channels:            ${channels.length}`);
    channels.forEach((ch: any) =>
      console.log(`      - ${ch.title} (@${ch.username}) [tgId=${ch.telegramId}, subs=${ch.subscriberCount}]`)
    );
    console.log(`    Deals (advertiser):  ${dealsAdv.length}`);
    dealsAdv.forEach((d: any) => console.log(`      - ${d.id} [${d.status}]`));
    console.log(`    Deals (channel):     ${dealsOwn.length}`);
    dealsOwn.forEach((d: any) => console.log(`      - ${d.id} [${d.status}]`));
    console.log(`    Campaigns:           ${campaigns.length}`);
    campaigns.forEach((c: any) => console.log(`      - ${c.id}: ${c.title}`));
    console.log(`    Transactions:        ${transactions.length}`);
    transactions.forEach((t: any) => console.log(`      - ${t.id} [${t.type}] ${t.amount}`));
    console.log(`    Notifications:       ${notifCount}`);
    console.log(`    Reviews given:       ${reviewGiven}`);
    console.log(`    Reviews received:    ${reviewRecv}`);
    console.log(`    Achievements:        ${achievements.length}`);
    achievements.forEach((a: any) => console.log(`      - ${a.name}`));
    console.log(`    Wallets:             ${wallets.length}`);
    wallets.forEach((w: any) => console.log(`      - ${w.address}`));
    console.log(`    Sessions:            ${sessCount}`);
    console.log(`    Support tickets:     ${ticketCount}`);
    console.log(`    Favorites:           ${favCount}`);
    console.log(`    Saved filters:       ${filterCount}`);
    console.log(`    Deal messages:       ${msgCount}`);
    console.log(`    Deal timelines:      ${timelineCount}`);
    console.log(`    Balance:             ${balance.length > 0 ? JSON.stringify(balance[0]) : '(none)'}`);
    console.log(`    UserLevel:           ${userLevel.length > 0 ? JSON.stringify(userLevel[0]) : '(none)'}`);
    console.log('');
  }

  // Referrals
  console.log('\n=== REFERRALS ===');
  const referrals = await prisma.$queryRaw`SELECT * FROM referrals LIMIT 20` as any[];
  if (referrals.length === 0) console.log('  (none)');
  referrals.forEach((r: any) => console.log(`  referrer=${r.referrerId}, referred=${r.referredId}, status=${r.status}`));

  // Channel admins
  console.log('\n=== CHANNEL ADMINS ===');
  const admins = await prisma.$queryRaw`
    SELECT ca.*, u."telegramUsername", c.title as "channelTitle"
    FROM channel_admins ca
    JOIN users u ON ca."userId" = u.id
    JOIN channels c ON ca."channelId" = c.id
  ` as any[];
  if (admins.length === 0) console.log('  (none)');
  admins.forEach((a: any) => console.log(`  @${a.telegramUsername} -> ${a.channelTitle}`));

  console.log('\nDone!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
