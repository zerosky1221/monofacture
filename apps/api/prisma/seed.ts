import { PrismaClient, UserRole, ChannelStatus, ChannelCategory, AdFormat } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { telegramId: BigInt(1) },
    update: {},
    create: {
      telegramId: BigInt(1),
      telegramUsername: 'admin',
      firstName: 'Admin',
      roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  console.log(`Created admin user: ${adminUser.id}`);

  // Create test channel owner
  const channelOwner = await prisma.user.upsert({
    where: { telegramId: BigInt(123456789) },
    update: {},
    create: {
      telegramId: BigInt(123456789),
      telegramUsername: 'test_channel_owner',
      firstName: 'Test',
      lastName: 'Owner',
      roles: [UserRole.USER, UserRole.CHANNEL_OWNER],
      tonWalletAddress: 'EQTest_Channel_Owner_Wallet_Address_Here_Replace',
    },
  });

  console.log(`Created channel owner: ${channelOwner.id}`);

  // Create test advertiser
  const advertiser = await prisma.user.upsert({
    where: { telegramId: BigInt(987654321) },
    update: {},
    create: {
      telegramId: BigInt(987654321),
      telegramUsername: 'test_advertiser',
      firstName: 'Test',
      lastName: 'Advertiser',
      roles: [UserRole.USER, UserRole.ADVERTISER],
      tonWalletAddress: 'EQTest_Advertiser_Wallet_Address_Here_Replace',
    },
  });

  console.log(`Created advertiser: ${advertiser.id}`);

  // Create test channel
  const channel = await prisma.channel.upsert({
    where: { telegramId: BigInt(-1001234567890) },
    update: {},
    create: {
      telegramId: BigInt(-1001234567890),
      username: 'test_channel',
      title: 'Test Channel',
      description: 'A test channel for development',
      ownerId: channelOwner.id,
      status: ChannelStatus.ACTIVE,
      isActive: true,
      categories: [ChannelCategory.CRYPTO, ChannelCategory.TECH],
      language: 'en',
      isBotAdded: true,
      botAddedAt: new Date(),
      verifiedAt: new Date(),
      subscriberCount: 10000,
      averageViews: 5000,
      engagementRate: 5.5,
    },
  });

  console.log(`Created channel: ${channel.id}`);

  // Create channel pricing
  const pricingData = [
    { adFormat: AdFormat.POST, pricePerHour: BigInt(5_000_000_000), pricePermanent: BigInt(100_000_000_000), minHours: 1, maxHours: 168 }, // 5 TON/hr, 100 TON permanent
    { adFormat: AdFormat.FORWARD, pricePerHour: BigInt(3_000_000_000), pricePermanent: null, minHours: 1, maxHours: 72 }, // 3 TON/hr
    { adFormat: AdFormat.PIN_MESSAGE, pricePerHour: BigInt(10_000_000_000), pricePermanent: null, minHours: 1, maxHours: 168 }, // 10 TON/hr
  ];

  for (const pricing of pricingData) {
    await prisma.channelPricing.upsert({
      where: {
        channelId_adFormat: {
          channelId: channel.id,
          adFormat: pricing.adFormat,
        },
      },
      update: {},
      create: {
        channelId: channel.id,
        adFormat: pricing.adFormat,
        pricePerHour: pricing.pricePerHour,
        pricePermanent: pricing.pricePermanent,
        minHours: pricing.minHours,
        maxHours: pricing.maxHours,
        isActive: true,
      },
    });
  }

  console.log('Created channel pricing');

  // Create channel stats
  await prisma.channelStats.upsert({
    where: { channelId: channel.id },
    update: {},
    create: {
      channelId: channel.id,
      subscriberCount: 10000,
      averageViews: 5000,
      averageReach: 4500,
      engagementRate: 5.5,
      averageReactions: 250,
      postsLast24h: 5,
      postsLast7d: 30,
      averagePostsPerDay: 4.3,
    },
  });

  console.log('Created channel stats');

  // Seed FAQ categories and items
  const faqData = [
    {
      slug: 'getting-started',
      title: 'Getting Started',
      description: 'Learn the basics of using Monofacture',
      icon: 'rocket',
      order: 1,
      items: [
        {
          question: 'What is Monofacture?',
          answer: 'Monofacture is a Telegram Ads Marketplace that connects advertisers with Telegram channel owners. You can buy ad placements or sell them on your channels.',
          order: 1,
        },
        {
          question: 'How do I get started as an advertiser?',
          answer: 'Simply browse channels in the Explore tab, select one that fits your target audience, and submit an ad request. Once accepted and paid, your ad will be published.',
          order: 2,
        },
        {
          question: 'How do I list my channel?',
          answer: "Go to My Channels, tap Add Channel, and follow the verification process. You'll need to add our bot as admin to verify ownership.",
          order: 3,
        },
      ],
    },
    {
      slug: 'payments',
      title: 'Payments & Wallet',
      description: 'Everything about payments, escrow, and withdrawals',
      icon: 'wallet',
      order: 2,
      items: [
        {
          question: 'How does the escrow system work?',
          answer: "When you pay for an ad, funds are held in escrow. They're only released to the channel owner after the ad is published and the deal is completed.",
          order: 1,
        },
        {
          question: 'What payment methods are accepted?',
          answer: 'We accept TON (Toncoin) cryptocurrency. Connect your TON wallet to deposit and withdraw funds.',
          order: 2,
        },
        {
          question: 'How long does withdrawal take?',
          answer: 'Withdrawals are processed instantly on the TON blockchain. You should receive funds within a few minutes.',
          order: 3,
        },
      ],
    },
    {
      slug: 'deals',
      title: 'Deals & Advertising',
      description: 'How deals work, disputes, and cancellations',
      icon: 'handshake',
      order: 3,
      items: [
        {
          question: "What happens if a channel owner doesn't publish my ad?",
          answer: 'If the deal times out without publication, funds are automatically refunded from escrow. You can also open a dispute for manual review.',
          order: 1,
        },
        {
          question: 'Can I cancel a deal?',
          answer: 'Deals can be cancelled before payment. After payment, cancellation requires agreement from both parties or a dispute resolution.',
          order: 2,
        },
        {
          question: 'How are disputes handled?',
          answer: 'Our support team reviews all evidence and makes a fair decision. Both parties can submit messages and proof.',
          order: 3,
        },
      ],
    },
  ];

  for (const category of faqData) {
    const faqCategory = await prisma.faqCategory.upsert({
      where: { slug: category.slug },
      update: {
        title: category.title,
        description: category.description,
        icon: category.icon,
        order: category.order,
      },
      create: {
        slug: category.slug,
        title: category.title,
        description: category.description,
        icon: category.icon,
        order: category.order,
        isPublished: true,
      },
    });

    // Delete existing items and re-create
    await prisma.faqItem.deleteMany({ where: { categoryId: faqCategory.id } });
    await prisma.faqItem.createMany({
      data: category.items.map((item) => ({
        categoryId: faqCategory.id,
        question: item.question,
        answer: item.answer,
        order: item.order,
        isPublished: true,
      })),
    });

    console.log(`Seeded FAQ category: ${category.title} (${category.items.length} items)`);
  }

  // Seed achievements
  const achievementsData = [
    // Getting Started
    { key: 'first_login', name: 'First Steps', description: 'Log in for the first time', icon: 'rocket', category: 'getting_started', xpReward: 10, condition: { type: 'login_count', value: 1 }, order: 1 },
    { key: 'profile_complete', name: 'Identity', description: 'Complete your profile', icon: 'user', category: 'getting_started', xpReward: 20, condition: { type: 'profile_complete', value: true }, order: 2 },
    { key: 'wallet_connected', name: 'Wallet Ready', description: 'Connect a TON wallet', icon: 'wallet', category: 'getting_started', xpReward: 25, condition: { type: 'wallet_connected', value: true }, order: 3 },
    // Channels
    { key: 'first_channel', name: 'Channel Owner', description: 'Add your first channel', icon: 'tv', category: 'channels', xpReward: 30, condition: { type: 'channel_count', value: 1 }, order: 1 },
    { key: 'five_channels', name: 'Media Network', description: 'Manage 5 channels', icon: 'grid', category: 'channels', xpReward: 100, condition: { type: 'channel_count', value: 5 }, order: 2 },
    { key: 'verified_channel', name: 'Verified Publisher', description: 'Get a channel verified', icon: 'shield-check', category: 'channels', xpReward: 50, condition: { type: 'channel_verified', value: true }, order: 3 },
    // Deals
    { key: 'first_deal', name: 'Deal Maker', description: 'Complete your first deal', icon: 'handshake', category: 'deals', xpReward: 50, condition: { type: 'deal_count', value: 1 }, order: 1 },
    { key: 'ten_deals', name: 'Experienced Trader', description: 'Complete 10 deals', icon: 'trending-up', category: 'deals', xpReward: 150, condition: { type: 'deal_count', value: 10 }, order: 2 },
    { key: 'fifty_deals', name: 'Deal Master', description: 'Complete 50 deals', icon: 'trophy', category: 'deals', xpReward: 500, condition: { type: 'deal_count', value: 50 }, order: 3 },
    { key: 'hundred_deals', name: 'Legend', description: 'Complete 100 deals', icon: 'crown', category: 'deals', xpReward: 1000, condition: { type: 'deal_count', value: 100 }, order: 4 },
    // Earnings
    { key: 'first_earning', name: 'First Profit', description: 'Earn your first TON', icon: 'gem', category: 'earnings', xpReward: 30, condition: { type: 'earning_ton', value: 1 }, order: 1 },
    { key: 'hundred_ton', name: 'Rising Star', description: 'Earn 100 TON total', icon: 'star', category: 'earnings', xpReward: 200, condition: { type: 'earning_ton', value: 100 }, order: 2 },
    { key: 'thousand_ton', name: 'Big Earner', description: 'Earn 1,000 TON total', icon: 'zap', category: 'earnings', xpReward: 750, condition: { type: 'earning_ton', value: 1000 }, order: 3 },
    // Social
    { key: 'first_review', name: 'Critic', description: 'Leave your first review', icon: 'message-circle', category: 'social', xpReward: 15, condition: { type: 'review_count', value: 1 }, order: 1 },
    { key: 'five_reviews', name: 'Avid Reviewer', description: 'Leave 5 reviews', icon: 'message-circle', category: 'social', xpReward: 50, condition: { type: 'review_count', value: 5 }, order: 2 },
    { key: 'five_star_rating', name: 'Top Rated', description: 'Receive 10 five-star reviews', icon: 'star', category: 'social', xpReward: 100, condition: { type: 'rating', value: 5 }, order: 3 },
    { key: 'first_referral', name: 'Ambassador', description: 'Refer your first user', icon: 'users', category: 'social', xpReward: 50, condition: { type: 'referral_count', value: 1 }, order: 4 },
    { key: 'five_referrals', name: 'Networker', description: 'Refer 5 users', icon: 'users', category: 'social', xpReward: 150, condition: { type: 'referral_count', value: 5 }, order: 5 },
    { key: 'ten_referrals', name: 'Influencer', description: 'Refer 10 users', icon: 'globe', category: 'social', xpReward: 300, condition: { type: 'referral_count', value: 10 }, order: 6 },
    { key: 'twenty_referrals', name: 'Community Leader', description: 'Refer 20 users', icon: 'globe', category: 'social', xpReward: 500, condition: { type: 'referral_count', value: 20 }, order: 7 },
  ];

  for (const achievement of achievementsData) {
    await prisma.achievement.upsert({
      where: { key: achievement.key },
      update: {
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        category: achievement.category,
        xpReward: achievement.xpReward,
        condition: achievement.condition,
        order: achievement.order,
      },
      create: {
        key: achievement.key,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        category: achievement.category,
        xpReward: achievement.xpReward,
        condition: achievement.condition,
        order: achievement.order,
        isActive: true,
      },
    });
  }

  console.log(`Seeded ${achievementsData.length} achievements`);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
