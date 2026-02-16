import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Compass, Tv, Handshake, Plus, Users, TrendingUp, Shield } from '../components/icons';
import { useTelegram } from '../providers/TelegramProvider';
import { useAuth } from '../hooks/useAuth';
import { Card, StatCard, GradientBanner } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Skeleton } from '../components/ui/Skeleton';
import { apiClient } from '../api/client';
import { formatNumber } from '../lib/utils';
import { useTranslation } from '../i18n';
import { useScrollMemory } from '../hooks/useScrollMemory';

interface PlatformStats {
  totalChannels: number;
  totalDeals: number;
  totalVolume: string;
  activeUsers: number;
}

export function HomePage() {
  const navigate = useNavigate();
  const { user: telegramUser } = useTelegram();
  const { isAuthenticated, user } = useAuth();
  const { t } = useTranslation();
  useScrollMemory('/');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: () => apiClient.get<PlatformStats>('/stats/platform'),
  });

  return (
    <div className="page-container pb-4">
      {telegramUser && (
        <GradientBanner
          title={t('home.welcomeBack', { name: telegramUser.first_name })}
          subtitle={isAuthenticated ? t('home.readyToGrow') : t('home.connectChannels')}
          gradient="blue"
          className="mb-6"
          action={
            !isAuthenticated && (
              <Button size="sm" variant="secondary">
                {t('home.getStarted')}
              </Button>
            )
          }
        />
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card onClick={() => navigate('/')} className="text-center py-5">
          <div className="w-12 h-12 rounded-full bg-accent-blue/20 flex items-center justify-center mx-auto mb-3">
            <Compass className="w-6 h-6 text-accent-blue" />
          </div>
          <p className="font-semibold text-white">{t('home.explore')}</p>
          <p className="text-xs text-text-secondary mt-1">{t('home.findChannels')}</p>
        </Card>

        <Card onClick={() => navigate('/campaigns')} className="text-center py-5">
          <div className="w-12 h-12 rounded-full bg-accent-purple/20 flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-6 h-6 text-accent-purple" />
          </div>
          <p className="font-semibold text-white">{t('home.campaigns')}</p>
          <p className="text-xs text-text-secondary mt-1">{t('home.browseAds')}</p>
        </Card>

        {isAuthenticated && (
          <>
            <Card onClick={() => navigate('/my-channels')} className="text-center py-5">
              <div className="w-12 h-12 rounded-full bg-accent-green/20 flex items-center justify-center mx-auto mb-3">
                <Plus className="w-6 h-6 text-accent-green" />
              </div>
              <p className="font-semibold text-white">{t('home.addChannel')}</p>
              <p className="text-xs text-text-secondary mt-1">{t('home.startEarning')}</p>
            </Card>

            <Card onClick={() => navigate('/deals')} className="text-center py-5">
              <div className="w-12 h-12 rounded-full bg-accent-orange/20 flex items-center justify-center mx-auto mb-3">
                <Handshake className="w-6 h-6 text-accent-orange" />
              </div>
              <p className="font-semibold text-white">{t('home.myDeals')}</p>
              <p className="text-xs text-text-secondary mt-1">{t('home.trackProgress')}</p>
            </Card>
          </>
        )}
      </div>

      <h2 className="text-lg font-semibold text-white mb-3">{t('home.platformStats')}</h2>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {isLoading ? (
          <>
            <Skeleton className="h-20 rounded-card" />
            <Skeleton className="h-20 rounded-card" />
            <Skeleton className="h-20 rounded-card" />
          </>
        ) : (
          <>
            <StatCard
              value={formatNumber(stats?.totalChannels || 0)}
              label={t('home.channels')}
              icon={<Tv className="w-5 h-5 text-accent-blue" />}
            />
            <StatCard
              value={formatNumber(stats?.totalDeals || 0)}
              label={t('home.deals')}
              icon={<Handshake className="w-5 h-5 text-accent-green" />}
            />
            <StatCard
              value={stats?.totalVolume || '0'}
              label={t('home.tonVolume')}
              icon={<span className="text-lg">💎</span>}
            />
          </>
        )}
      </div>

      <Card className="mb-6">
        <h3 className="text-base font-semibold text-white mb-4">{t('home.howItWorks')}</h3>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-blue flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              1
            </div>
            <div>
              <p className="font-medium text-white">{t('home.step1Title')}</p>
              <p className="text-sm text-text-secondary">{t('home.step1Desc')}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-blue flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              2
            </div>
            <div>
              <p className="font-medium text-white">{t('home.step2Title')}</p>
              <p className="text-sm text-text-secondary">{t('home.step2Desc')}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-blue flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              3
            </div>
            <div>
              <p className="font-medium text-white">{t('home.step3Title')}</p>
              <p className="text-sm text-text-secondary">{t('home.step3Desc')}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-green flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              4
            </div>
            <div>
              <p className="font-medium text-white">{t('home.step4Title')}</p>
              <p className="text-sm text-text-secondary">{t('home.step4Desc')}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card gradient>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white">{t('home.secureTransparent')}</p>
            <p className="text-sm text-white/80">{t('home.escrowProtects')}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
