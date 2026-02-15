import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trophy, Star, Shield, Handshake, Package, Users, Wallet, CheckCircle, TrendingUp, DollarSign } from '../components/icons';
import { achievementsApi } from '../api/achievements';
import type { Achievement, LeaderboardUser } from '../api/achievements';
import { Avatar } from '../components/ui/Avatar';
import { useTranslation } from '../i18n';

const CATEGORY_ICONS: Record<string, any> = {
  getting_started: Shield,
  channels: Package,
  deals: Handshake,
  earnings: Wallet,
  social: Users,
};

const CATEGORY_COLORS: Record<string, string> = {
  getting_started: '#3390ec',
  channels: '#22C55E',
  deals: '#F59E0B',
  earnings: '#8B5CF6',
  social: '#EF4444',
};

const ACHIEVEMENT_ICONS: Record<string, React.ReactNode> = {
  rocket: <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><path d="M12 2C12 2 7 7 7 12c0 2.76 2.24 5 5 5s5-2.24 5-5c0-5-5-10-5-10z" fill="#3390ec"/><path d="M12 17v5M9 22h6" stroke="#3390ec" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><circle cx="12" cy="8" r="4" fill="#22C55E"/><path d="M4 20c0-3.31 3.58-6 8-6s8 2.69 8 6" fill="#22C55E" fillOpacity="0.3"/></svg>,
  wallet: <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><rect x="2" y="6" width="20" height="14" rx="2" fill="#8B5CF6" fillOpacity="0.3" stroke="#8B5CF6" strokeWidth="1.5"/><circle cx="16" cy="13" r="1.5" fill="#8B5CF6"/></svg>,
  tv: <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><rect x="3" y="4" width="18" height="14" rx="2" fill="#F59E0B" fillOpacity="0.3" stroke="#F59E0B" strokeWidth="1.5"/><path d="M8 21h8" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  grid: <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><rect x="3" y="3" width="7" height="7" rx="1.5" fill="#22C55E"/><rect x="14" y="3" width="7" height="7" rx="1.5" fill="#22C55E" fillOpacity="0.7"/><rect x="3" y="14" width="7" height="7" rx="1.5" fill="#22C55E" fillOpacity="0.5"/><rect x="14" y="14" width="7" height="7" rx="1.5" fill="#22C55E" fillOpacity="0.3"/></svg>,
  'shield-check': <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="#3390ec" fillOpacity="0.2" stroke="#3390ec" strokeWidth="1.5"/><path d="M9 12l2 2 4-4" stroke="#3390ec" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  handshake: <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><path d="M7 11l3-3 4 2 3-3" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="2" y="8" width="5" height="10" rx="1" fill="#F59E0B" fillOpacity="0.3"/><rect x="17" y="8" width="5" height="10" rx="1" fill="#F59E0B" fillOpacity="0.3"/></svg>,
  'trending-up': <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><polyline points="23,6 13.5,15.5 8.5,10.5 1,18" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="17,6 23,6 23,12" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  trophy: <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><path d="M8 21h8M12 17v4M6 3h12v4a6 6 0 01-12 0V3z" fill="#F59E0B" fillOpacity="0.3" stroke="#F59E0B" strokeWidth="1.5"/><path d="M6 7H3v1a3 3 0 003 3M18 7h3v1a3 3 0 01-3 3" stroke="#F59E0B" strokeWidth="1.5"/></svg>,
  crown: <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><path d="M2 8l4 12h12l4-12-5 4-5-8-5 8-5-4z" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  gem: <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><path d="M6 3h12l4 7-10 11L2 10l4-7z" fill="#3390ec" fillOpacity="0.3" stroke="#3390ec" strokeWidth="1.5" strokeLinejoin="round"/><path d="M2 10h20M12 21L8 10l4-7 4 7-4 11z" stroke="#3390ec" strokeWidth="1" strokeOpacity="0.5"/></svg>,
  star: <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1"/></svg>,
  zap: <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  'message-circle': <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" fill="#22C55E" fillOpacity="0.3" stroke="#22C55E" strokeWidth="1.5"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><circle cx="9" cy="7" r="4" fill="#8B5CF6" fillOpacity="0.4"/><path d="M2 21v-1c0-3.31 2.69-6 6-6h2c3.31 0 6 2.69 6 6v1" fill="#8B5CF6" fillOpacity="0.2"/><circle cx="17" cy="7" r="3" fill="#8B5CF6" fillOpacity="0.3"/><path d="M18 14c2.21 0 4 1.79 4 4v3" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  globe: <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><circle cx="12" cy="12" r="10" fill="#22C55E" fillOpacity="0.2" stroke="#22C55E" strokeWidth="1.5"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke="#22C55E" strokeWidth="1.5"/></svg>,
};

type Tab = 'achievements' | 'leaderboard';
type SortBy = 'xp' | 'deals' | 'earnings';

export function AchievementsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('achievements');
  const [sortBy, setSortBy] = useState<SortBy>('xp');
  const queryClient = useQueryClient();

  const checkMutation = useMutation({
    mutationFn: achievementsApi.check,
    onSuccess: (data) => {
      if (data?.newlyAwarded?.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['achievements'] });
        queryClient.invalidateQueries({ queryKey: ['my-rank'] });
      }
    },
  });

  useEffect(() => {
    checkMutation.mutate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: achievementsApi.getAll,
  });

  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['leaderboard', sortBy],
    queryFn: () => achievementsApi.getLeaderboard(sortBy),
    enabled: tab === 'leaderboard',
  });

  const { data: myRank } = useQuery({
    queryKey: ['my-rank'],
    queryFn: achievementsApi.getMyRank,
    enabled: tab === 'leaderboard',
  });

  const level = data?.level;
  const achievements = data?.achievements || [];
  const stats = data?.stats;
  const categories = [...new Set(achievements.map(a => a.category))];

  const formatTon = (nano: string) => {
    const val = Number(nano) / 1e9;
    return val >= 1 ? val.toFixed(2) : val.toFixed(4);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-[#FFD700]" strokeWidth={1.5} />;
    if (rank === 2) return <Trophy className="w-5 h-5 text-[#C0C0C0]" strokeWidth={1.5} />;
    if (rank === 3) return <Trophy className="w-5 h-5 text-[#CD7F32]" strokeWidth={1.5} />;
    return <span className="text-sm font-bold text-[#666] w-5 text-center">{rank}</span>;
  };

  const getRankBg = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return 'bg-white/5 border-white/20';
    if (rank === 1) return 'bg-[#FFD700]/5 border-[#FFD700]/20';
    if (rank === 2) return 'bg-[#C0C0C0]/5 border-[#C0C0C0]/20';
    if (rank === 3) return 'bg-[#CD7F32]/5 border-[#CD7F32]/20';
    return 'bg-[#111] border-[#1A1A1A]';
  };

  const sortOptions: { key: SortBy; label: string; icon: typeof Star }[] = [
    { key: 'xp', label: 'XP', icon: Star },
    { key: 'deals', label: t('dashboard.deals'), icon: TrendingUp },
    { key: 'earnings', label: t('dashboard.earnings'), icon: DollarSign },
  ];

  return (
    <div className="min-h-full pb-24 page-enter">
      <div className="bg-black border-b border-[#1A1A1A] px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-semibold text-white">{t('achievements.title')}</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {level && (
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-white font-semibold">Level {level.level}</p>
                  <p className="text-[#999] text-sm">{level.totalXp} XP</p>
                </div>
              </div>
              <div className="text-right">
                {stats && <p className="text-[#666] text-xs">{stats.unlocked}/{stats.total} {t('achievements.unlocked')}</p>}
              </div>
            </div>
            {level.nextLevel && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[#999]">Level {level.nextLevel.level}</span>
                  <span className="text-[#999]">{Math.round(level.progress)}%</span>
                </div>
                <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${level.progress}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setTab('achievements')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === 'achievements' ? 'bg-white text-black' : 'bg-[#1A1A1A] text-[#999]'
            }`}
          >
            {t('achievements.title')}
          </button>
          <button
            onClick={() => setTab('leaderboard')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === 'leaderboard' ? 'bg-white text-black' : 'bg-[#1A1A1A] text-[#999]'
            }`}
          >
            {t('achievements.leaderboard')}
          </button>
        </div>

        {tab === 'achievements' ? (
          isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map(category => {
                const catAchievements = achievements.filter(a => a.category === category);
                const CatIcon = CATEGORY_ICONS[category] || Trophy;
                const color = CATEGORY_COLORS[category] || '#888';

                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3">
                      <CatIcon className="w-4 h-4" style={{ color }} strokeWidth={1.5} />
                      <h3 className="text-sm font-medium text-[#999] uppercase tracking-wider">{category}</h3>
                    </div>
                    <div className="space-y-2">
                      {catAchievements.map((ach: Achievement) => (
                        <div
                          key={ach.id}
                          className={`bg-[#111] border rounded-2xl p-4 flex items-center gap-3 transition-all ${
                            ach.unlocked ? 'border-white/20' : 'border-[#1A1A1A] opacity-60'
                          }`}
                        >
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                            ach.unlocked ? 'bg-white/10' : 'bg-[#1A1A1A]'
                          }`}>
                            {ACHIEVEMENT_ICONS[ach.icon] || <Trophy className="w-6 h-6 text-[#666]" strokeWidth={1.5} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-white font-medium text-sm truncate">{ach.name}</p>
                              {ach.unlocked && <CheckCircle className="w-4 h-4 text-[#22C55E] flex-shrink-0" strokeWidth={1.5} />}
                            </div>
                            <p className="text-[#666] text-xs mt-0.5">{ach.description}</p>
                          </div>
                          <span className="text-xs text-[#999] font-medium">+{ach.xpReward} XP</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="space-y-4">
            {myRank && (
              <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-2xl font-bold text-white">#{myRank.rank}</p>
                    <p className="text-xs text-[#666]">
                      {t('achievements.ofUsers', { total: myRank.totalUsers })} &middot; Top {myRank.percentile}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{myRank.xp}</p>
                    <p className="text-xs text-[#666]">XP</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white font-medium">Level {myRank.level}</span>
                    <span className="text-[#666]">{myRank.xpProgress} / {myRank.xpNeeded}</span>
                  </div>
                  <div className="h-2 bg-[#222] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${myRank.xpNeeded > 0 ? Math.min(100, (myRank.xpProgress / myRank.xpNeeded) * 100) : 100}%` }}
                    />
                  </div>
                  {myRank.level < 10 && (
                    <p className="text-xs text-[#666] mt-1 text-right">
                      {myRank.xpToNextLevel} XP {t('achievements.toNextLevel')} {myRank.level + 1}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {sortOptions.map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setSortBy(opt.key)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      sortBy === opt.key
                        ? 'bg-white text-black'
                        : 'bg-[#1A1A1A] text-[#999]'
                    }`}
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.5} />
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {leaderboardData && (
              <div className="flex items-center gap-2 text-xs text-[#666]">
                <Users className="w-4 h-4" strokeWidth={1.5} />
                <span>{leaderboardData.totalUsers} {t('achievements.usersTotal')}</span>
              </div>
            )}

            {leaderboardLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="skeleton h-16 rounded-xl" />
                ))}
              </div>
            ) : !leaderboardData?.users.length ? (
              <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-8 text-center">
                <Users className="w-12 h-12 mx-auto mb-3 text-[#666] opacity-50" strokeWidth={1.5} />
                <p className="text-[#666] text-sm">{t('achievements.noData')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboardData.users.map((user: LeaderboardUser) => (
                  <div
                    key={user.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      getRankBg(user.rank, user.isCurrentUser)
                    }`}
                  >
                    <div className="w-8 flex items-center justify-center flex-shrink-0">
                      {getRankIcon(user.rank)}
                    </div>

                    <Avatar
                      src={user.photoUrl}
                      name={user.firstName || user.telegramUsername || '?'}
                      size="sm"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">
                          {user.firstName || user.telegramUsername || 'Anonymous'}
                        </p>
                        {user.isCurrentUser && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-white text-black rounded-full font-medium flex-shrink-0">
                            {t('achievements.you')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#666]">
                        Lvl {user.level} &middot; {user.achievementCount} {t('achievements.unlocked')}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      {sortBy === 'xp' && (
                        <>
                          <p className="text-sm font-bold text-white">{user.xp}</p>
                          <p className="text-xs text-[#666]">XP</p>
                        </>
                      )}
                      {sortBy === 'deals' && (
                        <>
                          <p className="text-sm font-bold text-white">{user.totalDeals}</p>
                          <p className="text-xs text-[#666]">{t('dashboard.deals')}</p>
                        </>
                      )}
                      {sortBy === 'earnings' && (
                        <>
                          <p className="text-sm font-bold text-[#22C55E]">{formatTon(user.totalEarnings)}</p>
                          <p className="text-xs text-[#666]">TON</p>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AchievementsPage;
