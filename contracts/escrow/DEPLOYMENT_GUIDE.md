# 🚀 MONOFACTURE ESCROW — TESTNET DEPLOYMENT GUIDE

## Предварительные требования

- Node.js 20+
- Telegram аккаунт (для получения testnet TON)
- Скомпилированный контракт (уже готов в `build/`)

---

## Шаг 1: Генерация кошелька (если нет 24-word мнемоника)

⚠️ **КРИТИЧНО**: Текущий `ESCROW_MASTER_SEED` в `.env` содержит только 12 слов. TON требует **24 слова**.

```powershell
cd D:\Monofacture\contracts\escrow
npx ts-node scripts/generate-wallet.ts
```

Скрипт выдаст:
- 24-word мнемоник
- Адрес кошелька (testnet)
- Готовые строки для `.env`

## Шаг 2: Обновить `.env`

Замени в `D:\Monofacture\.env`:

```env
# ═══ СТАРОЕ (12 слов — НЕ РАБОТАЕТ!) ═══
# ESCROW_MASTER_SEED=abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about

# ═══ НОВОЕ (24 слова от generate-wallet.ts) ═══
ESCROW_MASTER_SEED=word1 word2 word3 ... word24
DEPLOY_MNEMONIC=word1 word2 word3 ... word24
TON_PLATFORM_WALLET_ADDRESS=EQxxxxxxxxxxxxxxxxxxxxxx
TON_API_KEY=your_api_key_from_toncenter
TON_TESTNET=true
```

### Получить TON API Key:
1. Открой https://toncenter.com
2. Получи бесплатный API key для testnet
3. Добавь в `.env` как `TON_API_KEY`

## Шаг 3: Получить testnet TON

Нужно ~2 TON на кошельке для деплоя и тестов.

### Вариант 1: Telegram бот (рекомендуется)
1. Открой Telegram: [@testgiver_ton_bot](https://t.me/testgiver_ton_bot)
2. Отправь адрес кошелька (non-bounceable формат из шага 1)
3. Получишь 5 testnet TON

### Вариант 2: TON Console Faucet
1. Открой https://faucet.tonconsole.com
2. Вставь адрес
3. Получи тестовые TON

### Вариант 3: Tonhub Sandbox
1. Установи Tonhub
2. Переключись на testnet
3. Получи TON из встроенного faucet

## Шаг 4: Деплой контракта

### Вариант A: Standalone скрипт (рекомендуется)

```powershell
cd D:\Monofacture\contracts\escrow
npx ts-node scripts/deploy-testnet-standalone.ts
```

Скрипт:
1. Подключится к testnet
2. Проверит баланс (если мало — покажет адрес для пополнения и будет ждать)
3. Задеплоит контракт
4. Верифицирует состояние
5. Сохранит результат в `deployment-testnet.json`

### Вариант B: Blueprint интерактивный

```powershell
cd D:\Monofacture\contracts\escrow
npx blueprint run deployMonofactureEscrow --testnet --mnemonic
```

Blueprint спросит:
- Сеть: testnet ✓
- Тип кошелька: mnemonic
- 24 слова мнемоника

## Шаг 5: Проверить деплой

После успешного деплоя:

1. Откройте ссылку на explorer из вывода скрипта
2. Проверьте что контракт `Active`
3. Проверьте `deployment-testnet.json` — сохранён адрес контракта

```powershell
# Прочитать адрес
type D:\Monofacture\contracts\escrow\deployment-testnet.json
```

## Шаг 6: Тест на testnet (опционально)

```powershell
cd D:\Monofacture\contracts\escrow
npx ts-node scripts/test-deployed-contract.ts
```

Тест выполнит:
1. ✅ Прочитает состояние контракта (STATUS=0 PENDING)
2. 💰 Отправит TON на контракт (funding)
3. ✅ Проверит статус (STATUS=1 FUNDED)
4. 🔓 Отправит Release от platform wallet
5. ✅ Проверит что контракт уничтожен и деньги отправлены

---

## Шаг 7: Интеграция с Backend

После деплоя, backend автоматически будет деплоить новые контракты для каждой сделки.

Убедитесь что в `.env`:
```env
ESCROW_MASTER_SEED=<24 слова>              # Для подписи транзакций
TON_PLATFORM_WALLET_ADDRESS=<адрес>        # Куда идут released средства
TON_API_KEY=<ключ>                         # Для toncenter API
TON_TESTNET=true                           # Testnet режим
```

Перезапустите backend:
```powershell
cd D:\Monofacture
docker-compose restart api
```

---

## Message Opcodes (из ABI)

| Message        | Opcode (decimal) | Hex        |
|----------------|-------------------|------------|
| Deploy         | 2490013878        | 0x946A98B6 |
| Fund           | 2753303635        | 0xA4234053 |
| Release        | 408342921         | 0x18559D89 |
| Refund         | 2214270485        | 0x83F48E15 |
| Dispute        | 446414026         | 0x1A9BA8CA |
| Resolve        | 2442029911        | 0x919E4357 |
| ExtendDeadline | 2244072172        | 0x85C8AAEC |

---

## Troubleshooting

### "Platform wallet not initialized"
→ `ESCROW_MASTER_SEED` не 24 слова. Перегенерируй.

### "Insufficient funds"
→ Пополни кошелёк через @testgiver_ton_bot

### "Contract state verification may take a moment"
→ Подожди 10-30 секунд, testnet медленнее mainnet

### "Exit code 59612: Only advertiser can fund"
→ Funding отправлен не с адреса advertiser'а. Проверь адреса при деплое.

### "Exit code 21911: Escrow not funded"
→ Контракт не профинансирован. Сначала отправь TON на контракт.

### "Exit code 7161: Only platform can release"
→ Release отправлен не с platform wallet. Проверь `TON_PLATFORM_WALLET_ADDRESS`.
