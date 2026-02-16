import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function run() {
  const tables = ['campaigns', 'deals', 'notifications', 'user_sessions', 'transactions', 'user_balances', 'user_levels', 'favorites', 'saved_filters', 'deal_messages', 'deal_timelines', 'support_tickets', 'reviews', 'user_achievements', 'user_wallets'];
  for (const t of tables) {
    const cols = await p.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name = '${t}' ORDER BY ordinal_position`) as any[];
    console.log(`${t}: ${cols.map(c => c.column_name).join(', ')}`);
  }
  await p.$disconnect();
}
run().catch(e => { console.error(e); p.$disconnect(); });
