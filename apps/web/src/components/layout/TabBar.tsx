import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTelegram } from '../../providers/TelegramProvider';
import { useTranslation } from '../../i18n';

function CompassOutline() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88"/>
    </svg>
  );
}

function CompassFilled() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.66 6.34l-2.12 5.66-5.66 2.12 2.12-5.66 5.66-2.12z"/>
    </svg>
  );
}

function ChannelsOutline() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  );
}

function ChannelsFilled() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="7" height="7" rx="2"/>
      <rect x="14" y="3" width="7" height="7" rx="2"/>
      <rect x="3" y="14" width="7" height="7" rx="2"/>
      <rect x="14" y="14" width="7" height="7" rx="2"/>
    </svg>
  );
}

function DealsOutline() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <polyline points="9,15 11,17 15,13"/>
    </svg>
  );
}

function DealsFilled() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm1.8 10.9l-4.25 4.25a.996.996 0 01-1.41 0L8.2 15.2a.996.996 0 111.41-1.41l1.24 1.25 3.54-3.54a.996.996 0 111.41 1.41z"/>
    </svg>
  );
}

function WalletOutline() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="14" rx="2"/>
      <path d="M2 10h20"/>
      <path d="M6 6V4a2 2 0 012-2h8a2 2 0 012 2v2"/>
      <circle cx="16" cy="14" r="1.5"/>
    </svg>
  );
}

function WalletFilled() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4v2h12V4a2 2 0 00-2-2H8a2 2 0 00-2 2z"/>
      <path d="M20 6H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2zm-4 10a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>
    </svg>
  );
}

function ProfileOutline() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-3.31 3.58-6 8-6s8 2.69 8 6"/>
    </svg>
  );
}

function ProfileFilled() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="8" r="4"/>
      <path d="M12 14c-4.42 0-8 2.69-8 6v1h16v-1c0-3.31-3.58-6-8-6z"/>
    </svg>
  );
}

const TAB_KEYS = [
  { path: '/', OutlineIcon: CompassOutline, FilledIcon: CompassFilled, key: 'nav.explore', fallback: 'Explore' },
  { path: '/channels', OutlineIcon: ChannelsOutline, FilledIcon: ChannelsFilled, key: 'nav.channels', fallback: 'Channels' },
  { path: '/deals', OutlineIcon: DealsOutline, FilledIcon: DealsFilled, key: 'nav.deals', fallback: 'Deals' },
  { path: '/wallet', OutlineIcon: WalletOutline, FilledIcon: WalletFilled, key: 'nav.wallet', fallback: 'Wallet' },
  { path: '/profile', OutlineIcon: ProfileOutline, FilledIcon: ProfileFilled, key: 'nav.profile', fallback: 'Profile' },
];

export default function TabBar() {
  const { hapticFeedback } = useTelegram();
  const { t } = useTranslation();
  const location = useLocation();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const initialHeight = viewport.height;

    const handleResize = () => {
      const heightDiff = initialHeight - viewport.height;
      setIsKeyboardOpen(heightDiff > 150);
    };

    viewport.addEventListener('resize', handleResize);
    return () => viewport.removeEventListener('resize', handleResize);
  }, []);

  const isTabActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  if (isKeyboardOpen) {
    return null;
  }

  return (
    <div
      data-tabbar
      className="fixed left-0 right-0 z-[100] px-4"
      style={{
        bottom: 'calc(12px + var(--tg-safe-area-bottom, env(safe-area-inset-bottom, 0px)))'
      }}
    >
      <nav
        className="mx-auto max-w-md rounded-full h-16"
        style={{
          background: 'rgba(28, 28, 30, 0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div className="flex items-center justify-around h-full">
          {TAB_KEYS.map((tab) => {
            const active = isTabActive(tab.path);
            const label = t(tab.key) !== tab.key ? t(tab.key) : tab.fallback;

            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                onClick={() => hapticFeedback('selection')}
                className="flex flex-col items-center justify-center gap-1 w-14"
              >
                <div className={`transition-all duration-200 ${active ? 'text-white' : 'text-[#636366]'}`}>
                  {active ? <tab.FilledIcon /> : <tab.OutlineIcon />}
                </div>
                <span className={`text-[10px] font-medium transition-colors duration-200 ${active ? 'text-white' : 'text-[#636366]'}`}>
                  {label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
