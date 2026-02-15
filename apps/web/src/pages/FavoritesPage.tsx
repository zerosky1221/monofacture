import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Heart } from '../components/icons';
import { favoritesApi } from '../api/favorites';
import { EmptyStateIllustration } from '../components/ui/EmptyStateIllustration';
import { useTranslation } from '../i18n';

export function FavoritesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoritesApi.getAll(),
  });

  return (
    <div className="min-h-full pb-24 page-enter">
      <div className="bg-black border-b border-[#1A1A1A] px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-semibold text-white">{t('favorites.title')}</h1>
        </div>
      </div>

      <div className="px-4 pt-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
        ) : !data?.items?.length ? (
          <EmptyStateIllustration
            type="no-favorites"
            title={t('favorites.empty')}
            description={t('favorites.emptyDesc')}
            action={{ label: t('favorites.browse'), onClick: () => navigate('/') }}
          />
        ) : (
          <div className="space-y-3">
            {data.items.map((channel: any) => (
              <button
                key={channel.id}
                onClick={() => navigate(`/channel/${channel.id}`)}
                className="w-full bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 flex items-center gap-3 text-left active:bg-[#1A1A1A] transition-all"
              >
                {channel.photoUrl ? (
                  <img src={channel.photoUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
                    <Heart className="w-5 h-5 text-[#EF4444]" strokeWidth={1.5} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{channel.title}</p>
                  {channel.username && <p className="text-[#666] text-sm">@{channel.username}</p>}
                  <p className="text-[#999] text-xs mt-0.5">
                    {channel.subscriberCount?.toLocaleString()} {t('channel.subscribers')}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FavoritesPage;
