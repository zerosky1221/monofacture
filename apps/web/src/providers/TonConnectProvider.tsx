import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { TonConnectUI, Wallet, ConnectedWallet, WalletInfoWithOpenMethod } from '@tonconnect/ui-react';
import { useTelegram } from './TelegramProvider';
import { apiClient } from '../api/client';

interface TonConnectContextValue {
  tonConnectUI: TonConnectUI | null;
  wallet: Wallet | null;
  connected: boolean;
  connecting: boolean;
  address: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendTransaction: (params: {
    to: string;
    amount: string;
    payload?: string;
  }) => Promise<string>;
}

const TonConnectContext = createContext<TonConnectContextValue | null>(null);

const manifestUrl = import.meta.env.VITE_TON_CONNECT_MANIFEST_URL ||
  'https://telegram-ads-marketplace.com/tonconnect-manifest.json';

export function TonConnectProvider({ children }: { children: ReactNode }) {
  const { isReady: isTelegramReady } = useTelegram();
  const [tonConnectUI, setTonConnectUI] = useState<TonConnectUI | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [connecting, setConnecting] = useState(false);
  const savedAddressRef = useRef<string | null>(null);

  const saveWalletToBackend = useCallback(async (address: string, publicKey?: string) => {
    if (savedAddressRef.current === address) return;

    try {
      await apiClient.patch('/users/me/wallet', {
        address,
        publicKey,
        setAsMain: true,
      });
      savedAddressRef.current = address;
    } catch {
    }
  }, []);

  useEffect(() => {
    if (!isTelegramReady) return;

    const ui = new TonConnectUI({
      manifestUrl,
    });

    setTonConnectUI(ui);

    const unsubscribe = ui.onStatusChange((walletInfo: ConnectedWallet | null) => {
      if (walletInfo) {
        setWallet(walletInfo as Wallet);
        const address = walletInfo.account?.address;
        const publicKey = walletInfo.account?.publicKey;
        if (address) {
          saveWalletToBackend(address, publicKey);
        }
      } else {
        setWallet(null);
        savedAddressRef.current = null;
      }
    });

    const checkExistingConnection = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      const currentWallet = ui.wallet;
      if (currentWallet) {
        const address = currentWallet.account?.address;
        const publicKey = currentWallet.account?.publicKey;
        if (address) {
          setWallet(currentWallet as unknown as Wallet);
          saveWalletToBackend(address, publicKey);
        }
      }
    };
    checkExistingConnection();

    return () => {
      unsubscribe();
    };
  }, [isTelegramReady, saveWalletToBackend]);

  const connect = useCallback(async () => {
    if (!tonConnectUI) return;
    setConnecting(true);
    try {
      await tonConnectUI.openModal();
    } finally {
      setConnecting(false);
    }
  }, [tonConnectUI]);

  const disconnect = useCallback(async () => {
    if (!tonConnectUI) return;
    await tonConnectUI.disconnect();
  }, [tonConnectUI]);

  const sendTransaction = useCallback(
    async (params: { to: string; amount: string; payload?: string }): Promise<string> => {
      if (!tonConnectUI || !wallet) {
        throw new Error('Wallet not connected');
      }

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: params.to,
            amount: params.amount,
            payload: params.payload,
          },
        ],
      };

      const result = await tonConnectUI.sendTransaction(transaction);
      return result.boc;
    },
    [tonConnectUI, wallet]
  );

  const value: TonConnectContextValue = {
    tonConnectUI,
    wallet,
    connected: !!wallet,
    connecting,
    address: wallet?.account?.address || null,
    connect,
    disconnect,
    sendTransaction,
  };

  return (
    <TonConnectContext.Provider value={value}>
      {children}
    </TonConnectContext.Provider>
  );
}

export function useTonConnect() {
  const context = useContext(TonConnectContext);
  if (!context) {
    throw new Error('useTonConnect must be used within a TonConnectProvider');
  }
  return context;
}
