import { useEffect, useRef } from 'react';
import { useTonAddress, useTonWallet } from '@tonconnect/ui-react';
import { apiClient } from '../api/client';

export function WalletSync() {
  const wallet = useTonWallet();
  const address = useTonAddress(false);
  const friendlyAddress = useTonAddress(true);
  const lastSynced = useRef<string | null>(null);

  useEffect(() => {
    if (!wallet || !friendlyAddress) return;
    if (lastSynced.current === friendlyAddress) return;

    const syncWallet = async () => {
      try {
        await apiClient.patch('/users/me/wallet', {
          address: friendlyAddress,
          publicKey: (wallet.account as any)?.publicKey || undefined,
          setAsMain: true,
        });
        lastSynced.current = friendlyAddress;
      } catch {
      }
    };

    syncWallet();
  }, [wallet, friendlyAddress]);

  return null;
}
