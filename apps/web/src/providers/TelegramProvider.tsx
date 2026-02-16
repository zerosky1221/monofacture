import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface TelegramContextType {
  webApp: typeof window.Telegram.WebApp | null;
  user: TelegramUser | null;
  initData: string | null;
  startParam: string | null;
  isReady: boolean;
  colorScheme: 'light' | 'dark';
  expand: () => void;
  close: () => void;
  showAlert: (message: string) => void;
  showConfirm: (message: string) => Promise<boolean>;
  hapticFeedback: (type: 'impact' | 'notification' | 'selection') => void;
  setMainButton: (text: string, onClick: () => void, isActive?: boolean) => void;
  hideMainButton: () => void;
  showBackButton: (onClick: () => void) => void;
  hideBackButton: () => void;
}

const TelegramContext = createContext<TelegramContextType | null>(null);

interface TelegramProviderProps {
  children: ReactNode;
}

export function TelegramProvider({ children }: TelegramProviderProps) {
  const [webApp, setWebApp] = useState<typeof window.Telegram.WebApp | null>(null);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [initData, setInitData] = useState<string | null>(null);
  const [startParam, setStartParam] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (tg) {
      tg.ready();
      tg.expand();

      if (typeof (tg as any).requestFullscreen === 'function') {
        try { (tg as any).requestFullscreen(); } catch {}
      }

      setWebApp(tg);
      setUser(tg.initDataUnsafe?.user || null);
      setInitData(tg.initData || null);
      setColorScheme(tg.colorScheme || 'light');

      const SP_KEY = 'mf_referral_code';
      let sp = tg.initDataUnsafe?.start_param || null;
      if (!sp) {
        const urlParams = new URLSearchParams(window.location.search);
        sp = urlParams.get('tgWebAppStartParam') || null;
      }
      if (sp) {
        localStorage.setItem(SP_KEY, sp);
        setStartParam(sp);
      } else {
        const saved = localStorage.getItem(SP_KEY);
        if (saved) setStartParam(saved);
      }

      setIsReady(true);

      const applySafeArea = () => {
        const sa = (tg as any).safeAreaInset || {};
        const csa = (tg as any).contentSafeAreaInset || {};

        const safeTop = sa.top || 0;
        const contentTop = csa.top || 0;
        const safeBottom = sa.bottom || 0;

        document.documentElement.style.setProperty('--tg-safe-area-top', `${safeTop}px`);
        document.documentElement.style.setProperty('--tg-content-safe-area-top', `${contentTop}px`);
        document.documentElement.style.setProperty('--tg-safe-area-bottom', `${safeBottom}px`);
        document.documentElement.style.setProperty('--tg-top-inset', `${safeTop + contentTop}px`);
      };

      applySafeArea();

      tg.onEvent('safeAreaChanged' as any, applySafeArea);
      tg.onEvent('contentSafeAreaChanged' as any, applySafeArea);
      tg.onEvent('fullscreenChanged' as any, applySafeArea);

      document.body.classList.toggle('dark', tg.colorScheme === 'dark');

      tg.onEvent('themeChanged', () => {
        setColorScheme(tg.colorScheme || 'light');
        document.body.classList.toggle('dark', tg.colorScheme === 'dark');
      });
    } else {
      setUser({
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        language_code: 'en',
      });
      setIsReady(true);
    }
  }, []);

  const expand = () => webApp?.expand();
  const close = () => webApp?.close();

  const showAlert = (message: string) => {
    if (webApp) {
      webApp.showAlert(message);
    } else {
      alert(message);
    }
  };

  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (webApp) {
        webApp.showConfirm(message, resolve);
      } else {
        resolve(confirm(message));
      }
    });
  };

  const hapticFeedback = (type: 'impact' | 'notification' | 'selection') => {
    if (webApp?.HapticFeedback) {
      switch (type) {
        case 'impact':
          webApp.HapticFeedback.impactOccurred('medium');
          break;
        case 'notification':
          webApp.HapticFeedback.notificationOccurred('success');
          break;
        case 'selection':
          webApp.HapticFeedback.selectionChanged();
          break;
      }
    }
  };

  const setMainButton = (text: string, onClick: () => void, isActive = true) => {
    if (webApp?.MainButton) {
      webApp.MainButton.setText(text);
      webApp.MainButton.onClick(onClick);
      if (isActive) {
        webApp.MainButton.show();
        webApp.MainButton.enable();
      } else {
        webApp.MainButton.disable();
      }
    }
  };

  const hideMainButton = () => {
    webApp?.MainButton?.hide();
  };

  const showBackButton = (onClick: () => void) => {
    if (webApp?.BackButton) {
      webApp.BackButton.onClick(onClick);
      webApp.BackButton.show();
    }
  };

  const hideBackButton = () => {
    webApp?.BackButton?.hide();
  };

  const value: TelegramContextType = {
    webApp,
    user,
    initData,
    startParam,
    isReady,
    colorScheme,
    expand,
    close,
    showAlert,
    showConfirm,
    hapticFeedback,
    setMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
  };

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegram() {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within a TelegramProvider');
  }
  return context;
}

declare global {
  interface Window {
    Telegram: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        initDataUnsafe: {
          user?: TelegramUser;
          start_param?: string;
        };
        colorScheme: 'light' | 'dark';
        themeParams: Record<string, string>;
        showAlert: (message: string, callback?: () => void) => void;
        showConfirm: (message: string, callback: (confirmed: boolean) => void) => void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
        };
        BackButton: {
          isVisible: boolean;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        onEvent: (eventType: string, callback: () => void) => void;
        offEvent: (eventType: string, callback: () => void) => void;
      };
    };
  }
}
