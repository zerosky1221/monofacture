import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Spinner } from '@telegram-tools/ui-kit';
import { useTranslation } from '../../i18n';

export function LoadingScreen() {
  const { t } = useTranslation();
  const [debugInfo, setDebugInfo] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const store = useAuthStore.getState();
      const tg = (window as any).Telegram?.WebApp;
      const info = [
        `API: ${import.meta.env.VITE_API_URL || '/api/v1'}`,
        `TG: ${tg ? 'yes' : 'no'}`,
        `initData: ${tg?.initData ? tg.initData.length + ' chars' : 'null'}`,
        `token: ${store.token ? store.token.substring(0, 15) + '...' : 'null'}`,
        `user: ${store.user?.id || 'null'}`,
        `tgId: ${store.telegramId || 'null'}`,
        `time: ${new Date().toLocaleTimeString()}`,
      ].join('\n');
      setDebugInfo(info);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    if (newCount >= 5) {
      setShowDebug(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full" onClick={handleTap}>
      <Spinner size="40px" color="white" />
      <p className="text-[#999] text-sm mt-4">{t('common.loading')}</p>
      {showDebug && (
        <pre className="mt-4 p-3 bg-[#111] rounded-lg text-[10px] text-[#0f0] font-mono whitespace-pre-wrap max-w-[90vw] overflow-auto">
          {debugInfo}
        </pre>
      )}
    </div>
  );
}
