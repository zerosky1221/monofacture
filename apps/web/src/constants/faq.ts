export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqSection {
  id: string;
  title: string;
  icon: string;
  items: FaqItem[];
}

const FAQ_DATA_EN: FaqSection[] = [
  {
    id: 'general',
    title: 'General',
    icon: 'HelpCircle',
    items: [
      {
        id: 'what-is-monofacture',
        question: 'What is Monofacture?',
        answer: 'Monofacture is a secure peer-to-peer marketplace for buying and selling advertising in Telegram channels. We connect advertisers with channel owners and protect both parties with escrow payments powered by TON blockchain.',
      },
      {
        id: 'how-does-it-work',
        question: 'How does it work?',
        answer: 'Advertisers browse channels, create a deal with their preferred ad format and budget. The channel owner accepts or rejects the deal. Once accepted, the advertiser deposits payment into a smart contract escrow. The channel owner creates and publishes the ad, and funds are released upon completion.',
      },
      {
        id: 'is-it-safe',
        question: 'Is it safe to use?',
        answer: 'Yes. All payments are protected by TON blockchain escrow smart contracts. Your funds are locked in a secure contract that neither party can access unilaterally. We also have a dispute resolution system and verified channel badges.',
      },
      {
        id: 'what-are-fees',
        question: 'What are the fees?',
        answer: 'Monofacture charges a 5% platform fee on each deal, paid by the advertiser on top of the ad price. Channel owners receive 100% of their listed price. There are no hidden fees.',
      },
      {
        id: 'who-can-use',
        question: 'Who can use Monofacture?',
        answer: 'Anyone with a Telegram account can use Monofacture. Advertisers can browse and book ads immediately. Channel owners need to register their channel and verify bot access before accepting deals.',
      },
      {
        id: 'supported-languages',
        question: 'What languages are supported?',
        answer: 'The platform supports channels in 12 languages: English, Russian, Uzbek, Spanish, German, French, Chinese, Arabic, Portuguese, Hindi, Japanese, and Korean. You can filter channels by language.',
      },
    ],
  },
  {
    id: 'advertisers',
    title: 'For Advertisers',
    icon: 'Megaphone',
    items: [
      {
        id: 'how-to-find-channels',
        question: 'How do I find channels for advertising?',
        answer: 'Go to the Explore page to browse all channels. Use the search bar, category filters (Crypto, Tech, News, etc.), and advanced filters for subscribers, price, rating, and language to find the perfect channel.',
      },
      {
        id: 'how-to-create-deal',
        question: 'How do I create a deal?',
        answer: 'Open a channel page and tap "Book Now" on your preferred ad format. Write your ad brief, set requirements, choose a posting schedule (optional), and submit. The channel owner has 24 hours to accept or reject your request.',
      },
      {
        id: 'ad-formats',
        question: 'What ad formats are available?',
        answer: 'The available ad format is Post — a standard channel post. The price is set by the channel owner.',
      },
      {
        id: 'how-payment-works-advertiser',
        question: 'How does payment work?',
        answer: 'After the channel owner accepts your deal, you have 24 hours to deposit payment. Funds go into a TON blockchain escrow contract \u2014 not to the channel owner directly. The money is released only when you confirm the ad was published.',
      },
      {
        id: 'what-if-no-post',
        question: 'What if the channel doesn\'t post my ad?',
        answer: 'If the channel owner fails to deliver, you can open a dispute. Our team reviews the case and can issue a full refund from the escrow. Deals also auto-expire after 24 hours of inactivity in early stages.',
      },
      {
        id: 'how-to-request-refund',
        question: 'How do I request a refund?',
        answer: 'You can cancel and get a full refund at any time before creative approval (during Created, Pending Payment, or Creative Pending stages). After that, open a dispute and our team will review the case within 24-48 hours.',
      },
      {
        id: 'anonymous-deals',
        question: 'Can I create anonymous deals?',
        answer: 'Yes. When creating a deal, you can toggle "Anonymous" mode. This hides your identity from the channel owner throughout the entire deal process. Your name and profile won\'t be visible.',
      },
      {
        id: 'creative-revisions',
        question: 'Can I request changes to the ad content?',
        answer: 'Yes. After the channel owner submits creative content, you can approve it or request a revision with specific feedback. Up to 3 revision rounds are allowed per deal.',
      },
      {
        id: 'deal-timeout',
        question: 'What happens if the channel owner doesn\'t respond?',
        answer: 'If the channel owner doesn\'t accept or reject within 24 hours, the deal automatically expires. No payment is taken. You can create a new deal with another channel.',
      },
    ],
  },
  {
    id: 'channel-owners',
    title: 'For Channel Owners',
    icon: 'Users',
    items: [
      {
        id: 'how-to-add-channel',
        question: 'How do I add my channel?',
        answer: 'Go to "My Channels" from your profile, tap "Add Channel", and follow the steps. You\'ll need to add @monofacturebot as an admin to your Telegram channel, then verify ownership through the app.',
      },
      {
        id: 'how-to-verify',
        question: 'How do I verify channel ownership?',
        answer: 'After adding your channel, click "Verify" in the channel management page. The system checks that @monofacturebot has admin access to your channel. Once verified, set your pricing to activate your listing.',
      },
      {
        id: 'how-to-set-pricing',
        question: 'How do I set pricing?',
        answer: 'In your channel management page, go to the Pricing section. Set the price in TON for posts. You need pricing enabled to appear in the marketplace.',
      },
      {
        id: 'how-do-i-get-paid',
        question: 'How do I get paid?',
        answer: 'When a deal completes, your earnings are credited to your in-app balance instantly. You receive 100% of your listed price. You can withdraw to your TON wallet anytime (minimum 1 TON).',
      },
      {
        id: 'channel-requirements',
        question: 'What are the requirements?',
        answer: 'You need to add our bot as a channel admin, verify ownership, and set at least one pricing option. There are no minimum subscriber requirements. You can set ad requirements and content guidelines in your channel settings.',
      },
      {
        id: 'multiple-channels',
        question: 'Can I manage multiple channels?',
        answer: 'Yes. You can register up to 50 channels under one account. Each channel has its own pricing, settings, and deal history. Manage them all from the "My Channels" page.',
      },
      {
        id: 'can-reject-deals',
        question: 'Can I reject deals?',
        answer: 'Absolutely. You have full control over which deals to accept. Review the advertiser\'s brief, profile, and rating before deciding. You can also set your channel to "Not Accepting Orders" to pause incoming requests.',
      },
      {
        id: 'auto-accept',
        question: 'Is there an auto-accept feature?',
        answer: 'Yes. In your channel settings, you can enable "Auto-accept deals" to automatically accept all incoming deal requests. You can also set minimum and maximum budget thresholds to filter deals.',
      },
      {
        id: 'anonymous-listing',
        question: 'Can I hide my identity as channel owner?',
        answer: 'Yes. Enable "Anonymous Listing" in your channel settings. Advertisers will see "Anonymous" instead of your name and profile. Your channel stats and reviews remain visible.',
      },
    ],
  },
  {
    id: 'deals-payments',
    title: 'Deals & Payments',
    icon: 'Handshake',
    items: [
      {
        id: 'what-is-escrow',
        question: 'What is escrow?',
        answer: 'Escrow is a secure holding mechanism. When you pay for a deal, funds are locked in a TON blockchain smart contract. The money can\'t be touched by either party until the deal completes or a dispute is resolved.',
      },
      {
        id: 'escrow-duration',
        question: 'How long does escrow hold funds?',
        answer: 'Funds stay in escrow until the advertiser confirms the ad was published, or until a dispute is resolved. The escrow contract has a 24-hour deadline from creation, but this resets as the deal progresses.',
      },
      {
        id: 'deal-fails',
        question: 'What happens if a deal fails?',
        answer: 'If a deal is cancelled or expires before creative approval, you get a full automatic refund. If it fails after creative approval, open a dispute and our team will review and decide on a refund.',
      },
      {
        id: 'confirm-placement',
        question: 'How do I confirm ad placement?',
        answer: 'After the channel owner publishes your ad, they mark it as "Posted". You can then verify the post exists and tap "Confirm & Complete" to release the escrow funds to the channel owner.',
      },
      {
        id: 'deal-statuses',
        question: 'What do deal statuses mean?',
        answer: 'Created \u2014 waiting for channel response. Pending Payment \u2014 accepted, awaiting your deposit. Creative Pending \u2014 paid, waiting for ad content. Creative Submitted \u2014 content ready for your review. Posted \u2014 ad is live. Completed \u2014 funds released.',
      },
      {
        id: 'timeout-policies',
        question: 'What are the timeout policies?',
        answer: 'Channel owners have 24 hours to accept/reject a deal. Advertisers have 24 hours to make payment after acceptance. Creative submission has a 48-hour deadline. Deals that timeout automatically expire and funds are refunded.',
      },
      {
        id: 'dispute-process',
        question: 'How does the dispute process work?',
        answer: 'Either party can open a dispute with a reason (e.g., "Post not published", "Wrong content"). Our team reviews the evidence and resolves it within 24-48 hours. The resolution either releases funds to the channel owner or refunds the advertiser.',
      },
      {
        id: 'dispute-reasons',
        question: 'What are valid dispute reasons?',
        answer: 'You can dispute for: post not published, post deleted early, post content modified after approval, wrong content posted, wrong posting time, or other reasons with a description.',
      },
      {
        id: 'min-max-deals',
        question: 'Are there deal amount limits?',
        answer: 'The minimum deal amount is 1 TON. The maximum is 100,000 TON. You can have up to 100 active deals at a time.',
      },
    ],
  },
  {
    id: 'wallet',
    title: 'TON Wallet',
    icon: 'Wallet',
    items: [
      {
        id: 'how-to-connect-wallet',
        question: 'How do I connect my wallet?',
        answer: 'Go to Profile > Wallet and tap "Connect Wallet". Choose your TON wallet app (Tonkeeper, TonHub, etc.) and approve the connection. Your wallet address will be linked to your account.',
      },
      {
        id: 'supported-wallets',
        question: 'Which wallets are supported?',
        answer: 'Any TON Connect compatible wallet works, including Tonkeeper, TonHub, MyTonWallet, and OpenMask. We recommend Tonkeeper for the best experience on mobile.',
      },
      {
        id: 'how-to-deposit',
        question: 'How do I deposit for a deal?',
        answer: 'When a deal is accepted, go to the deal page and tap "Pay". A payment QR code and TON transfer link will appear. Open your wallet app, scan the QR or tap the link, and confirm the transaction.',
      },
      {
        id: 'how-to-withdraw',
        question: 'How do I withdraw my earnings?',
        answer: 'Go to Wallet, tap "Withdraw", enter the amount (minimum 1 TON), and confirm. Funds are sent to your connected TON wallet. A small network fee (~0.05 TON) is deducted from the withdrawal.',
      },
      {
        id: 'transaction-fees',
        question: 'What are the transaction fees?',
        answer: 'TON blockchain network fees are approximately 0.05 TON per transaction. The 5% platform fee is only charged on deals, not on deposits or withdrawals. Withdrawal fee is deducted from the withdrawal amount.',
      },
      {
        id: 'payment-fails',
        question: 'What if my payment fails?',
        answer: 'If a payment doesn\'t go through, check your wallet balance and try again. The system checks for payment every 10 seconds. If you sent funds but the system didn\'t detect it, contact support with your transaction hash.',
      },
      {
        id: 'balance-types',
        question: 'What are "Available" and "Pending" balances?',
        answer: '"Available" is money you can withdraw right now. "Pending" is money locked in active deals that hasn\'t been released yet. Once a deal completes, pending funds move to available.',
      },
    ],
  },
  {
    id: 'security',
    title: 'Security & Trust',
    icon: 'ShieldCheck',
    items: [
      {
        id: 'money-protected',
        question: 'How is my money protected?',
        answer: 'All deal payments are locked in TON blockchain escrow smart contracts. Neither the platform nor the other party can access your funds without proper completion or dispute resolution. The smart contract code is transparent and verifiable.',
      },
      {
        id: 'channels-verified',
        question: 'How are channels verified?',
        answer: 'Channel owners must add our bot as admin to prove ownership. Verified channels display a badge. Channel stats (subscribers, views, engagement) are fetched directly from Telegram and updated regularly.',
      },
      {
        id: 'rating-system',
        question: 'How does the rating system work?',
        answer: 'After each completed deal, both parties can leave a 1-5 star review with sub-ratings for communication, quality, and timeliness. Ratings are averaged across all deals and displayed publicly on profiles and channel pages.',
      },
      {
        id: 'channel-reviews',
        question: 'What are channel reviews?',
        answer: 'Advertisers can leave channel-specific reviews rating audience quality, engagement, and reach accuracy. These help other advertisers assess channel performance beyond basic stats.',
      },
      {
        id: 'report-issues',
        question: 'How do I report issues?',
        answer: 'Go to Help & Support and create a ticket. Choose the appropriate category (Report User, Report Channel, Deal Problem, etc.) and describe the issue. Our team investigates all reports.',
      },
      {
        id: 'privacy-data',
        question: 'What about my privacy?',
        answer: 'We only access your public Telegram profile data (name, username, photo). Anonymous deal and listing options are available. Your wallet address is only shared with deal counterparties when needed for payment.',
      },
    ],
  },
  {
    id: 'referrals',
    title: 'Referral Program',
    icon: 'Gift',
    items: [
      {
        id: 'how-referrals-work',
        question: 'How does the referral program work?',
        answer: 'Share your unique referral link with friends. When they sign up and complete deals, you earn 20% of the platform fee from each of their deals. This is passive income \u2014 you earn as long as they use the platform.',
      },
      {
        id: 'where-referral-link',
        question: 'Where do I find my referral link?',
        answer: 'Go to Profile > Referrals to see your unique link. You can copy it or share it directly via Telegram. Your link looks like: t.me/monofacturebot?startapp=ref_XXXXXXXX',
      },
      {
        id: 'referral-earnings',
        question: 'How much do I earn per referral?',
        answer: 'You earn 20% of the 5% platform fee on every deal your referrals make. For example, if your referral completes a 100 TON deal, the platform fee is 5 TON, and you receive 1 TON.',
      },
      {
        id: 'referral-payout',
        question: 'When do I get referral earnings?',
        answer: 'Referral earnings are credited to your balance immediately when your referred user\'s deal completes. You can withdraw them along with your other earnings.',
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: 'AlertCircle',
    items: [
      {
        id: 'deal-stuck-pending',
        question: 'My deal is stuck in "Pending" status',
        answer: 'If the deal shows "Created", the channel owner hasn\'t responded yet (they have 24 hours). If it shows "Pending Payment", you need to complete the escrow deposit. Check the deal page for action buttons.',
      },
      {
        id: 'payment-not-received',
        question: 'I paid but the deal still shows "Pending Payment"',
        answer: 'Payment detection takes up to a minute. If it\'s been longer, check your wallet to confirm the transaction was successful. If the transaction is confirmed on blockchain but not reflected, contact support with your tx hash.',
      },
      {
        id: 'channel-not-showing',
        question: 'My channel isn\'t showing in the marketplace',
        answer: 'Make sure your channel is verified (bot added as admin), has at least one active pricing option, and "Accepting Orders" is turned on. Also check that your channel isn\'t set to private listing.',
      },
      {
        id: 'app-not-loading',
        question: 'The app isn\'t loading properly',
        answer: 'Try closing and reopening the Telegram Mini App. Make sure you\'re using the latest version of Telegram. If the issue persists, clear the app cache in Telegram settings or contact support.',
      },
      {
        id: 'wallet-connection-issues',
        question: 'I can\'t connect my TON wallet',
        answer: 'Ensure your wallet app is installed and updated. Try disconnecting and reconnecting. If using Tonkeeper, make sure it supports TON Connect v2. Some browser-based wallets may not work inside Telegram \u2014 try a mobile wallet app.',
      },
      {
        id: 'withdrawal-failed',
        question: 'My withdrawal failed',
        answer: 'Check that your connected wallet address is correct and you have at least 1 TON available balance. If the withdrawal shows "Failed", the funds are returned to your balance. Try again or contact support.',
      },
      {
        id: 'creative-not-loading',
        question: 'I can\'t see the creative content submitted',
        answer: 'Creative content includes text and media. If media isn\'t loading, check your internet connection. The content is stored securely and should appear on the deal detail page under the creative section.',
      },
      {
        id: 'cant-leave-review',
        question: 'I can\'t leave a review',
        answer: 'Reviews can only be left after a deal is marked as "Completed". Go to Profile > Reviews > Pending tab to see deals awaiting your review. Each party can leave one review per deal.',
      },
    ],
  },
];

const FAQ_DATA_RU: FaqSection[] = [
  {
    id: 'general',
    title: 'Общие вопросы',
    icon: 'HelpCircle',
    items: [
      {
        id: 'what-is-monofacture',
        question: 'Что такое Monofacture?',
        answer: 'Monofacture — это безопасный P2P-маркетплейс для покупки и продажи рекламы в Telegram-каналах. Мы соединяем рекламодателей с владельцами каналов и защищаем обе стороны с помощью эскроу-платежей на блокчейне TON.',
      },
      {
        id: 'how-does-it-work',
        question: 'Как это работает?',
        answer: 'Рекламодатели просматривают каналы, создают сделку с выбранным форматом и бюджетом. Владелец канала принимает или отклоняет предложение. После принятия рекламодатель вносит оплату в смарт-контракт эскроу. Владелец канала публикует рекламу, и средства переводятся после завершения.',
      },
      {
        id: 'is-it-safe',
        question: 'Безопасно ли это?',
        answer: 'Да. Все платежи защищены смарт-контрактами эскроу на блокчейне TON. Ваши средства заблокированы в защищённом контракте, к которому ни одна сторона не может получить доступ в одностороннем порядке. У нас также есть система разрешения споров и значки верификации каналов.',
      },
      {
        id: 'what-are-fees',
        question: 'Какие комиссии?',
        answer: 'Monofacture берёт 5% комиссии с каждой сделки, которую оплачивает рекламодатель сверх цены рекламы. Владельцы каналов получают 100% указанной цены. Скрытых комиссий нет.',
      },
      {
        id: 'who-can-use',
        question: 'Кто может пользоваться Monofacture?',
        answer: 'Любой пользователь Telegram может использовать Monofacture. Рекламодатели могут сразу просматривать и бронировать рекламу. Владельцам каналов нужно зарегистрировать канал и подтвердить доступ бота перед принятием сделок.',
      },
      {
        id: 'supported-languages',
        question: 'Какие языки поддерживаются?',
        answer: 'Платформа поддерживает каналы на 12 языках: английский, русский, узбекский, испанский, немецкий, французский, китайский, арабский, португальский, хинди, японский и корейский. Каналы можно фильтровать по языку.',
      },
    ],
  },
  {
    id: 'advertisers',
    title: 'Для рекламодателей',
    icon: 'Megaphone',
    items: [
      {
        id: 'how-to-find-channels',
        question: 'Как найти каналы для рекламы?',
        answer: 'Перейдите на страницу «Каталог», чтобы просмотреть все каналы. Используйте строку поиска, фильтры категорий (Крипто, Технологии, Новости и др.) и расширенные фильтры по подписчикам, цене, рейтингу и языку.',
      },
      {
        id: 'how-to-create-deal',
        question: 'Как создать сделку?',
        answer: 'Откройте страницу канала и нажмите «Заказать рекламу» на нужном формате. Напишите бриф, укажите требования, выберите время публикации (опционально) и отправьте. У владельца канала есть 24 часа на принятие или отклонение.',
      },
      {
        id: 'ad-formats',
        question: 'Какие форматы рекламы доступны?',
        answer: 'Доступный формат рекламы — Пост (стандартный пост в канале). Стоимость устанавливается владельцем канала.',
      },
      {
        id: 'how-payment-works-advertiser',
        question: 'Как работает оплата?',
        answer: 'После принятия сделки владельцем канала у вас есть 24 часа на внесение оплаты. Средства поступают в эскроу-контракт на блокчейне TON — не напрямую владельцу канала. Деньги переводятся только после подтверждения публикации рекламы.',
      },
      {
        id: 'what-if-no-post',
        question: 'Что если канал не опубликует мою рекламу?',
        answer: 'Если владелец канала не выполнит обязательства, вы можете открыть спор. Наша команда рассмотрит дело и может оформить полный возврат из эскроу. Сделки также автоматически истекают после 24 часов бездействия на ранних этапах.',
      },
      {
        id: 'how-to-request-refund',
        question: 'Как запросить возврат?',
        answer: 'Вы можете отменить сделку и получить полный возврат в любой момент до одобрения креатива (на этапах «Создана», «Ожидание оплаты» или «Ожидание креатива»). После этого откройте спор, и наша команда рассмотрит его в течение 24–48 часов.',
      },
      {
        id: 'anonymous-deals',
        question: 'Можно ли создать анонимную сделку?',
        answer: 'Да. При создании сделки можно включить режим «Аноним». Это скроет вашу личность от владельца канала на протяжении всей сделки. Ваше имя и профиль не будут видны.',
      },
      {
        id: 'creative-revisions',
        question: 'Можно ли запросить изменения в рекламном контенте?',
        answer: 'Да. После того как владелец канала отправит креатив, вы можете одобрить его или запросить доработку с конкретными замечаниями. Допускается до 3 раундов доработок за сделку.',
      },
      {
        id: 'deal-timeout',
        question: 'Что если владелец канала не ответит?',
        answer: 'Если владелец канала не примет и не отклонит сделку в течение 24 часов, она автоматически истечёт. Оплата не списывается. Вы можете создать новую сделку с другим каналом.',
      },
    ],
  },
  {
    id: 'channel-owners',
    title: 'Для владельцев каналов',
    icon: 'Users',
    items: [
      {
        id: 'how-to-add-channel',
        question: 'Как добавить свой канал?',
        answer: 'Перейдите в «Мои каналы» из профиля, нажмите «Добавить канал» и следуйте инструкциям. Вам нужно добавить @monofacturebot как администратора в ваш Telegram-канал, а затем подтвердить владение через приложение.',
      },
      {
        id: 'how-to-verify',
        question: 'Как подтвердить владение каналом?',
        answer: 'После добавления канала нажмите «Верифицировать» на странице управления каналом. Система проверит, что @monofacturebot имеет права администратора. После верификации настройте цены, чтобы активировать листинг.',
      },
      {
        id: 'how-to-set-pricing',
        question: 'Как установить цены?',
        answer: 'На странице управления каналом перейдите в раздел «Цены». Укажите стоимость в TON за пост. Для отображения в каталоге необходимо включить ценообразование.',
      },
      {
        id: 'how-do-i-get-paid',
        question: 'Как я получаю оплату?',
        answer: 'Когда сделка завершается, заработок мгновенно зачисляется на ваш баланс в приложении. Вы получаете 100% указанной цены. Вывод на TON-кошелёк доступен в любое время (минимум 1 TON).',
      },
      {
        id: 'channel-requirements',
        question: 'Какие требования?',
        answer: 'Нужно добавить нашего бота как администратора канала, подтвердить владение и установить хотя бы одну цену. Минимальных требований по подписчикам нет. Вы можете задать требования к рекламе и правила контента в настройках канала.',
      },
      {
        id: 'multiple-channels',
        question: 'Можно ли управлять несколькими каналами?',
        answer: 'Да. Можно зарегистрировать до 50 каналов на одном аккаунте. У каждого канала свои цены, настройки и история сделок. Управляйте всеми из раздела «Мои каналы».',
      },
      {
        id: 'can-reject-deals',
        question: 'Можно ли отклонять сделки?',
        answer: 'Конечно. Вы полностью контролируете, какие сделки принимать. Изучите бриф рекламодателя, профиль и рейтинг перед решением. Также можно перевести канал в режим «Не принимает заказы», чтобы приостановить входящие запросы.',
      },
      {
        id: 'auto-accept',
        question: 'Есть ли автоматическое принятие?',
        answer: 'Да. В настройках канала можно включить «Автоприём сделок» для автоматического принятия всех входящих запросов. Также можно установить пороги минимального и максимального бюджета для фильтрации сделок.',
      },
      {
        id: 'anonymous-listing',
        question: 'Можно ли скрыть свою личность как владельца канала?',
        answer: 'Да. Включите «Анонимное размещение» в настройках канала. Рекламодатели увидят «Аноним» вместо вашего имени и профиля. Статистика и отзывы канала остаются видимыми.',
      },
    ],
  },
  {
    id: 'deals-payments',
    title: 'Сделки и оплата',
    icon: 'Handshake',
    items: [
      {
        id: 'what-is-escrow',
        question: 'Что такое эскроу?',
        answer: 'Эскроу — это механизм безопасного хранения средств. Когда вы оплачиваете сделку, средства блокируются в смарт-контракте на блокчейне TON. Деньги недоступны ни одной из сторон до завершения сделки или разрешения спора.',
      },
      {
        id: 'escrow-duration',
        question: 'Как долго эскроу хранит средства?',
        answer: 'Средства хранятся в эскроу до подтверждения рекламодателем публикации рекламы или до разрешения спора. У эскроу-контракта есть дедлайн 24 часа с момента создания, но он обновляется по мере продвижения сделки.',
      },
      {
        id: 'deal-fails',
        question: 'Что происходит при срыве сделки?',
        answer: 'Если сделка отменена или истекла до одобрения креатива, вы получаете автоматический полный возврат. Если срыв произошёл после одобрения, откройте спор, и наша команда рассмотрит и решит вопрос о возврате.',
      },
      {
        id: 'confirm-placement',
        question: 'Как подтвердить размещение рекламы?',
        answer: 'После публикации рекламы владельцем канала он отмечает её как «Опубликована». Затем вы можете проверить наличие поста и нажать «Подтвердить и выплатить», чтобы перевести средства из эскроу владельцу канала.',
      },
      {
        id: 'deal-statuses',
        question: 'Что означают статусы сделки?',
        answer: 'Создана — ожидание ответа канала. Ожидание оплаты — принята, ждёт депозита. Ожидание креатива — оплачена, ждёт контент. Контент отправлен — готов к проверке. Опубликована — реклама на канале. Завершена — средства выплачены.',
      },
      {
        id: 'timeout-policies',
        question: 'Какие правила по тайм-аутам?',
        answer: 'У владельцев каналов 24 часа на принятие/отклонение сделки. У рекламодателей 24 часа на оплату после принятия. На отправку креатива — 48 часов. Сделки с истекшим сроком автоматически отменяются, средства возвращаются.',
      },
      {
        id: 'dispute-process',
        question: 'Как работает процесс спора?',
        answer: 'Любая сторона может открыть спор с указанием причины (например, «Пост не опубликован», «Неверный контент»). Наша команда изучает доказательства и решает спор в течение 24–48 часов. По итогу средства либо переводятся владельцу канала, либо возвращаются рекламодателю.',
      },
      {
        id: 'dispute-reasons',
        question: 'Какие причины для спора допустимы?',
        answer: 'Можно открыть спор по причинам: пост не опубликован, пост удалён раньше срока, контент поста изменён после одобрения, опубликован неверный контент, неправильное время публикации или другие причины с описанием.',
      },
      {
        id: 'min-max-deals',
        question: 'Есть ли лимиты по сумме сделки?',
        answer: 'Минимальная сумма сделки — 1 TON. Максимальная — 100 000 TON. Одновременно можно иметь до 100 активных сделок.',
      },
    ],
  },
  {
    id: 'wallet',
    title: 'TON-кошелёк',
    icon: 'Wallet',
    items: [
      {
        id: 'how-to-connect-wallet',
        question: 'Как подключить кошелёк?',
        answer: 'Перейдите в Профиль > Кошелёк и нажмите «Подключить кошелёк». Выберите приложение TON-кошелька (Tonkeeper, TonHub и др.) и подтвердите подключение. Адрес кошелька будет привязан к вашему аккаунту.',
      },
      {
        id: 'supported-wallets',
        question: 'Какие кошельки поддерживаются?',
        answer: 'Подойдёт любой кошелёк, совместимый с TON Connect: Tonkeeper, TonHub, MyTonWallet, OpenMask. Мы рекомендуем Tonkeeper для лучшего опыта на мобильных устройствах.',
      },
      {
        id: 'how-to-deposit',
        question: 'Как внести оплату за сделку?',
        answer: 'Когда сделка принята, перейдите на страницу сделки и нажмите «Оплатить». Появится QR-код и ссылка для перевода TON. Откройте приложение кошелька, отсканируйте QR или нажмите на ссылку и подтвердите транзакцию.',
      },
      {
        id: 'how-to-withdraw',
        question: 'Как вывести заработок?',
        answer: 'Перейдите в Кошелёк, нажмите «Вывести», введите сумму (минимум 1 TON) и подтвердите. Средства отправляются на подключённый TON-кошелёк. Небольшая комиссия сети (~0,05 TON) вычитается из суммы вывода.',
      },
      {
        id: 'transaction-fees',
        question: 'Какие комиссии за транзакции?',
        answer: 'Комиссии сети блокчейна TON составляют примерно 0,05 TON за транзакцию. Комиссия платформы 5% взимается только со сделок, не с пополнений или выводов. Комиссия за вывод вычитается из суммы вывода.',
      },
      {
        id: 'payment-fails',
        question: 'Что если оплата не прошла?',
        answer: 'Если платёж не прошёл, проверьте баланс кошелька и попробуйте снова. Система проверяет поступление платежа каждые 10 секунд. Если средства отправлены, но система не обнаружила их, обратитесь в поддержку с хешем транзакции.',
      },
      {
        id: 'balance-types',
        question: 'Что такое «Доступно» и «В ожидании»?',
        answer: '«Доступно» — деньги, которые можно вывести прямо сейчас. «В ожидании» — средства, заблокированные в активных сделках. После завершения сделки средства из «В ожидании» переходят в «Доступно».',
      },
    ],
  },
  {
    id: 'security',
    title: 'Безопасность и доверие',
    icon: 'ShieldCheck',
    items: [
      {
        id: 'money-protected',
        question: 'Как защищены мои деньги?',
        answer: 'Все платежи за сделки заблокированы в смарт-контрактах эскроу на блокчейне TON. Ни платформа, ни другая сторона не могут получить доступ к вашим средствам без надлежащего завершения сделки или разрешения спора. Код смарт-контракта прозрачен и верифицируем.',
      },
      {
        id: 'channels-verified',
        question: 'Как проверяются каналы?',
        answer: 'Владельцы каналов должны добавить нашего бота как администратора для подтверждения владения. Верифицированные каналы отображают значок. Статистика канала (подписчики, просмотры, вовлечённость) загружается напрямую из Telegram и регулярно обновляется.',
      },
      {
        id: 'rating-system',
        question: 'Как работает система рейтингов?',
        answer: 'После каждой завершённой сделки обе стороны могут оставить отзыв с оценкой 1–5 звёзд и подоценками за общение, качество и скорость. Рейтинги усредняются по всем сделкам и публично отображаются в профилях и на страницах каналов.',
      },
      {
        id: 'channel-reviews',
        question: 'Что такое отзывы о каналах?',
        answer: 'Рекламодатели могут оставлять отзывы о каналах с оценкой качества аудитории, вовлечённости и точности охвата. Это помогает другим рекламодателям оценить эффективность канала помимо базовой статистики.',
      },
      {
        id: 'report-issues',
        question: 'Как сообщить о проблеме?',
        answer: 'Перейдите в «Помощь и поддержка» и создайте тикет. Выберите подходящую категорию (Жалоба на пользователя, Жалоба на канал, Проблема со сделкой и др.) и опишите ситуацию. Наша команда расследует все обращения.',
      },
      {
        id: 'privacy-data',
        question: 'Как насчёт конфиденциальности?',
        answer: 'Мы используем только ваши публичные данные Telegram (имя, юзернейм, фото). Доступны анонимные сделки и листинг. Адрес кошелька передаётся контрагенту только при необходимости оплаты.',
      },
    ],
  },
  {
    id: 'referrals',
    title: 'Реферальная программа',
    icon: 'Gift',
    items: [
      {
        id: 'how-referrals-work',
        question: 'Как работает реферальная программа?',
        answer: 'Поделитесь уникальной реферальной ссылкой с друзьями. Когда они зарегистрируются и завершат сделки, вы получите 20% от комиссии платформы с каждой их сделки. Это пассивный доход — вы зарабатываете, пока они пользуются платформой.',
      },
      {
        id: 'where-referral-link',
        question: 'Где найти реферальную ссылку?',
        answer: 'Перейдите в Профиль > Рефералы, чтобы увидеть вашу уникальную ссылку. Можно скопировать или поделиться напрямую через Telegram. Ссылка выглядит так: t.me/monofacturebot?startapp=ref_XXXXXXXX',
      },
      {
        id: 'referral-earnings',
        question: 'Сколько я зарабатываю с реферала?',
        answer: 'Вы получаете 20% от 5% комиссии платформы с каждой сделки ваших рефералов. Например, если реферал завершает сделку на 100 TON, комиссия платформы составляет 5 TON, и вы получаете 1 TON.',
      },
      {
        id: 'referral-payout',
        question: 'Когда начисляются реферальные доходы?',
        answer: 'Реферальный заработок зачисляется на ваш баланс сразу после завершения сделки вашего реферала. Вы можете вывести его вместе с остальными заработками.',
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Устранение неполадок',
    icon: 'AlertCircle',
    items: [
      {
        id: 'deal-stuck-pending',
        question: 'Моя сделка зависла в статусе «Ожидание»',
        answer: 'Если сделка показывает «Создана», владелец канала ещё не ответил (у него 24 часа). Если «Ожидание оплаты» — вам нужно внести депозит в эскроу. Проверьте кнопки действий на странице сделки.',
      },
      {
        id: 'payment-not-received',
        question: 'Я оплатил, но сделка всё ещё «Ожидание оплаты»',
        answer: 'Обнаружение платежа занимает до минуты. Если прошло больше, проверьте в кошельке, что транзакция прошла. Если транзакция подтверждена в блокчейне, но не отражена — обратитесь в поддержку с хешем транзакции.',
      },
      {
        id: 'channel-not-showing',
        question: 'Мой канал не отображается в каталоге',
        answer: 'Убедитесь, что канал верифицирован (бот добавлен как администратор), есть хотя бы одна активная цена, и режим «Приём заказов» включён. Также проверьте, не включён ли приватный листинг.',
      },
      {
        id: 'app-not-loading',
        question: 'Приложение не загружается',
        answer: 'Попробуйте закрыть и заново открыть Telegram Mini App. Убедитесь, что используете последнюю версию Telegram. Если проблема сохраняется, очистите кэш приложения в настройках Telegram или обратитесь в поддержку.',
      },
      {
        id: 'wallet-connection-issues',
        question: 'Не могу подключить TON-кошелёк',
        answer: 'Убедитесь, что приложение кошелька установлено и обновлено. Попробуйте отключить и подключить заново. Если используете Tonkeeper, убедитесь, что он поддерживает TON Connect v2. Некоторые браузерные кошельки могут не работать в Telegram — попробуйте мобильное приложение.',
      },
      {
        id: 'withdrawal-failed',
        question: 'Вывод не прошёл',
        answer: 'Проверьте, что подключённый адрес кошелька корректен и доступный баланс не менее 1 TON. Если вывод показывает «Ошибка», средства возвращаются на ваш баланс. Попробуйте снова или обратитесь в поддержку.',
      },
      {
        id: 'creative-not-loading',
        question: 'Не вижу отправленный креатив',
        answer: 'Креатив включает текст и медиа. Если медиа не загружается, проверьте интернет-соединение. Контент хранится безопасно и должен отображаться на странице сделки в разделе креатива.',
      },
      {
        id: 'cant-leave-review',
        question: 'Не могу оставить отзыв',
        answer: 'Отзывы можно оставить только после того, как сделка получит статус «Завершена». Перейдите в Профиль > Отзывы > Ожидающие, чтобы увидеть сделки, ожидающие вашего отзыва. Каждая сторона может оставить один отзыв за сделку.',
      },
    ],
  },
];

export function getFaqData(lang: string): FaqSection[] {
  return lang === 'ru' ? FAQ_DATA_RU : FAQ_DATA_EN;
}

export const FAQ_DATA = FAQ_DATA_EN;

export function searchFaq(query: string, lang?: string): (FaqItem & { sectionId: string; sectionTitle: string })[] {
  if (!query.trim()) return [];
  const lower = query.toLowerCase();
  const results: (FaqItem & { sectionId: string; sectionTitle: string })[] = [];
  const data = lang ? getFaqData(lang) : FAQ_DATA_EN;

  for (const section of data) {
    for (const item of section.items) {
      if (
        item.question.toLowerCase().includes(lower) ||
        item.answer.toLowerCase().includes(lower)
      ) {
        results.push({ ...item, sectionId: section.id, sectionTitle: section.title });
      }
    }
  }

  return results;
}

export function getFaqCount(lang?: string): number {
  const data = lang ? getFaqData(lang) : FAQ_DATA_EN;
  return data.reduce((total, section) => total + section.items.length, 0);
}
