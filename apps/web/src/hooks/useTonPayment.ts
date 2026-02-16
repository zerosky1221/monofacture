import { useState, useCallback } from 'react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { toNano } from '@ton/core';
import toast from 'react-hot-toast';

interface PaymentParams {
  escrowAddress: string;
  amount: string;
  dealId: string;
}

export function useTonPayment() {
  const [tonConnectUI] = useTonConnectUI();
  const userAddress = useTonAddress();
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const deposit = useCallback(async ({ escrowAddress, amount, dealId }: PaymentParams): Promise<boolean> => {
    if (!userAddress) {
      toast.error('Please connect your wallet first');
      return false;
    }

    setIsLoading(true);
    setTxHash(null);

    try {
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: escrowAddress,
            amount: toNano(amount).toString(),
          },
        ],
      };

      const result = await tonConnectUI.sendTransaction(transaction);
      setTxHash(result.boc);
      toast.success('Payment sent! Waiting for confirmation...');
      return true;
    } catch (error: any) {
      if (error.message?.includes('User rejected') || error.message?.includes('Cancelled')) {
        toast.error('Transaction cancelled');
      } else {
        toast.error(error.message || 'Payment failed');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [tonConnectUI, userAddress]);

  const connectWallet = useCallback(async () => {
    try {
      await tonConnectUI.openModal();
    } catch {
    }
  }, [tonConnectUI]);

  const disconnectWallet = useCallback(async () => {
    try {
      await tonConnectUI.disconnect();
    } catch {
    }
  }, [tonConnectUI]);

  return {
    isLoading,
    txHash,
    isConnected: !!userAddress,
    walletAddress: userAddress,

    deposit,
    connectWallet,
    disconnectWallet,
  };
}

export function formatTonAmount(nanotons: string | number | bigint): string {
  const value = BigInt(nanotons);
  const tons = Number(value) / 1_000_000_000;
  return tons.toFixed(2);
}

export function parseToNano(tons: string | number): bigint {
  return BigInt(Math.floor(Number(tons) * 1_000_000_000));
}
