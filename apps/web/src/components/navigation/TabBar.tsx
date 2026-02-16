import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
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

interface TabItem {
  path: string;
  labelKey: string;
  OutlineIcon: () => React.JSX.Element;
  FilledIcon: () => React.JSX.Element;
  activePaths?: string[];
  badge?: number;
}

const tabs: TabItem[] = [
  {
    path: '/',
    labelKey: 'nav.explore',
    OutlineIcon: CompassOutline,
    FilledIcon: CompassFilled,
    activePaths: ['/', '/search'],
  },
  {
    path: '/channels',
    labelKey: 'nav.channels',
    OutlineIcon: ChannelsOutline,
    FilledIcon: ChannelsFilled,
    activePaths: ['/channels'],
  },
  {
    path: '/deals',
    labelKey: 'nav.deals',
    OutlineIcon: DealsOutline,
    FilledIcon: DealsFilled,
    activePaths: ['/deals', '/campaigns'],
  },
  {
    path: '/wallet',
    labelKey: 'nav.wallet',
    OutlineIcon: WalletOutline,
    FilledIcon: WalletFilled,
    activePaths: ['/wallet'],
  },
  {
    path: '/profile',
    labelKey: 'nav.profile',
    OutlineIcon: ProfileOutline,
    FilledIcon: ProfileFilled,
    activePaths: ['/profile', '/settings', '/notifications', '/help'],
  },
];

export function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hapticFeedback } = useTelegram();
  const { t } = useTranslation();
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

  const isActive = (tab: TabItem) => {
    if (tab.activePaths) {
      return tab.activePaths.some(path => {
        if (path === '/') {
          return location.pathname === '/';
        }
        return location.pathname.startsWith(path);
      });
    }
    return location.pathname === tab.path;
  };

  const handleTabClick = (tab: TabItem) => {
    if (location.pathname !== tab.path) {
      hapticFeedback('selection');
      navigate(tab.path);
    }
  };

  if (isKeyboardOpen) {
    return null;
  }

  return (
    <div
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
          {tabs.map((tab) => {
            const active = isActive(tab);

            return (
              <button
                key={tab.path}
                onClick={() => handleTabClick(tab)}
                className="flex flex-col items-center justify-center gap-1 w-14"
                aria-label={t(tab.labelKey)}
                aria-current={active ? 'page' : undefined}
              >
                <div className="relative">
                  <div className={`transition-all duration-200 ${active ? 'text-white' : 'text-[#636366]'}`}>
                    {active ? <tab.FilledIcon /> : <tab.OutlineIcon />}
                  </div>
                  {tab.badge && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[14px] h-3.5 px-1 bg-[#EF4444] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium transition-colors duration-200',
                    active ? 'text-white' : 'text-[#636366]'
                  )}
                >
                  {t(tab.labelKey)}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
