import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TonConnectUIProvider, THEME } from '@tonconnect/ui-react';
import { Toaster } from 'react-hot-toast';
import { TelegramProvider } from './providers/TelegramProvider';
import { I18nProvider } from './providers/I18nProvider';
import { ThemeProvider } from '@telegram-tools/ui-kit';
import { WalletSync } from './components/WalletSync';

import AppLayout from './components/layout/AppLayout';

import ExplorePage from './pages/ExplorePage';
import ChannelsPage from './pages/ChannelsPage';
import { ChannelDetailPage } from './pages/ChannelDetailPage';
import { ChannelManagePage } from './pages/ChannelManagePage';
import { CreateDealPage } from './pages/CreateDealPage';
import { PaymentPage } from './pages/PaymentPage';
import { DealDetailPage } from './pages/DealDetailPage';
import DealsPage from './pages/DealsPage';
import WalletPage from './pages/WalletPage';
import ProfilePage from './pages/ProfilePage';
import { UserProfilePage } from './pages/UserProfilePage';
import ReviewsPage from './pages/ReviewsPage';
import ReferralsPage from './pages/ReferralsPage';
import NotificationsPage from './pages/NotificationsPage';
import NotificationSettingsPage from './pages/NotificationSettingsPage';
import SupportPage from './pages/SupportPage';
import NewTicketPage from './pages/NewTicketPage';
import TicketDetailPage from './pages/TicketDetailPage';

import FavoritesPage from './pages/FavoritesPage';
import DashboardPage from './pages/DashboardPage';
import DealChatPage from './pages/DealChatPage';
import ComparePage from './pages/ComparePage';
import CalendarPage from './pages/CalendarPage';
import AchievementsPage from './pages/AchievementsPage';
import VerificationPage from './pages/VerificationPage';
import LanguageSettingsPage from './pages/LanguageSettingsPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { CampaignDetailPage } from './pages/CampaignDetailPage';
import { MyChannelsPage } from './pages/MyChannelsPage';

function HashRedirect() {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (location.hash === '#wallet') {
      window.location.hash = '';
      navigate('/wallet', { replace: true });
    }
  }, [location.hash, navigate]);
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const manifestUrl = import.meta.env.VITE_TON_CONNECT_MANIFEST_URL ||
  `${window.location.origin}/tonconnect-manifest.json`;

const botUsername = import.meta.env.VITE_BOT_USERNAME || 'monofacturebot';
const twaReturnUrl = `https://t.me/${botUsername}`;

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TonConnectUIProvider
        manifestUrl={manifestUrl}
        actionsConfiguration={{
          twaReturnUrl: twaReturnUrl as `${string}://${string}`,
          returnStrategy: 'back',
          skipRedirectToWallet: 'never',
        }}
        uiPreferences={{
          theme: THEME.DARK,
        }}
      >
        <TelegramProvider>
          <I18nProvider>
            <ThemeProvider>
            <WalletSync />
            <BrowserRouter>
              <HashRedirect />
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<ExplorePage />} />
                  <Route path="/channels" element={<ChannelsPage />} />
                  <Route path="/channels/:id/manage" element={<ChannelManagePage />} />
                  <Route path="/channel/:id" element={<ChannelDetailPage />} />
                  <Route path="/deals" element={<DealsPage />} />
                  <Route path="/deals/create" element={<CreateDealPage />} />
                  <Route path="/deals/:id" element={<DealDetailPage />} />
                  <Route path="/deals/:id/chat" element={<DealChatPage />} />
                  <Route path="/payment/:id" element={<PaymentPage />} />
                  <Route path="/wallet" element={<WalletPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/reviews" element={<ReviewsPage />} />
                  <Route path="/referrals" element={<ReferralsPage />} />
                  <Route path="/user/:id" element={<UserProfilePage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/notifications/settings" element={<NotificationSettingsPage />} />
                  <Route path="/support" element={<SupportPage />} />
                  <Route path="/support/new" element={<NewTicketPage />} />
                  <Route path="/support/tickets/:id" element={<TicketDetailPage />} />
                  <Route path="/favorites" element={<FavoritesPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/compare" element={<ComparePage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/achievements" element={<AchievementsPage />} />
                  <Route path="/verification" element={<VerificationPage />} />
                  <Route path="/settings/language" element={<LanguageSettingsPage />} />
                  <Route path="/campaigns" element={<CampaignsPage />} />
                  <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
                  <Route path="/my-channels" element={<MyChannelsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
              <Toaster
                position="top-center"
                containerStyle={{
                  top: 'calc(var(--tg-content-safe-area-inset-top, 0px) + var(--tg-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 4px)',
                }}
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: '#0A0A0A',
                    color: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    fontSize: '15px',
                    fontFamily: 'Inter, sans-serif',
                    border: '1px solid #1A1A1A',
                  },
                  success: {
                    iconTheme: {
                      primary: '#22C55E',
                      secondary: '#FFFFFF',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#EF4444',
                      secondary: '#FFFFFF',
                    },
                  },
                }}
              />
            </BrowserRouter>
            </ThemeProvider>
          </I18nProvider>
        </TelegramProvider>
      </TonConnectUIProvider>
    </QueryClientProvider>
  );
}

export default App;
