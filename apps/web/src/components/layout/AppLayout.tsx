import { Outlet } from 'react-router-dom';
import TabBar from './TabBar';
import { useAuth } from '../../hooks/useAuth';
import { useOnboarding } from '../../hooks/useOnboarding';
import { LoadingScreen } from '../ui/LoadingScreen';
import { WelcomeScreen } from '../onboarding/WelcomeScreen';

export default function AppLayout() {
  const { isLoading } = useAuth();
  const { shouldShowWelcome, isLoading: onboardingLoading } = useOnboarding();

  const showWelcome = shouldShowWelcome && !onboardingLoading;

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-white">
      {showWelcome && <WelcomeScreen />}
      <main
        className="flex-1 overflow-y-auto overflow-x-hidden scrollable"
        style={{
          paddingTop: 'var(--tg-top-inset, 0px)',
          paddingBottom: 'calc(var(--tg-safe-area-bottom, 0px) + 100px)',
        }}
      >
        {isLoading ? (
          <LoadingScreen />
        ) : (
          <Outlet />
        )}
      </main>
      {!showWelcome && <TabBar />}
    </div>
  );
}
