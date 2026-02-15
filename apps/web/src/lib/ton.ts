import { TonClient, Address, fromNano } from '@ton/ton';

const client = new TonClient({
  endpoint: 'https://toncenter.com/api/v2/jsonRPC',
});

export async function verifyPayment(
  escrowAddress: string,
  expectedAmount: string,
  senderAddress: string,
  afterTimestamp: number
): Promise<boolean> {
  try {
    const transactions = await client.getTransactions(
      Address.parse(escrowAddress),
      { limit: 50 }
    );

    for (const tx of transactions) {
      if (tx.inMessage?.info.type === 'internal') {
        const sender = tx.inMessage.info.src.toString();
        const amount = fromNano(tx.inMessage.info.value.coins);
        const timestamp = tx.now;

        if (
          sender === senderAddress &&
          Number(amount) >= Number(expectedAmount) &&
          timestamp >= afterTimestamp
        ) {
          return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function getWalletBalance(address: string): Promise<string> {
  try {
    const balance = await client.getBalance(Address.parse(address));
    return fromNano(balance);
  } catch {
    return '0';
  }
}

export function formatTonAmount(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00';
  return num.toFixed(2);
}

export function truncateAddress(address: string, chars = 6): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
