import { StarRating } from './StarRating';
import type { ReviewStats } from '../../api/reviews';

interface RatingStatsProps {
  stats: ReviewStats;
}

export function RatingStats({ stats }: RatingStatsProps) {
  const maxCount = Math.max(...Object.values(stats.ratingDistribution), 1);

  return (
    <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-3xl p-5">
      <div className="flex items-start gap-6">
        <div className="text-center flex-shrink-0">
          <p className="text-[48px] font-bold text-white leading-none">
            {stats.averageRating.toFixed(1)}
          </p>
          <StarRating value={stats.averageRating} readonly size="sm" />
          <p className="text-[#666] text-xs mt-1">
            {stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'}
          </p>
        </div>

        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.ratingDistribution[star] || 0;
            const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;

            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-[#999] text-xs w-3 text-right">{star}</span>
                <div className="flex-1 h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: star >= 4 ? '#22C55E' : star === 3 ? '#F59E0B' : '#EF4444',
                    }}
                  />
                </div>
                <span className="text-[#666] text-xs w-5">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {stats.topTags.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#1A1A1A]">
          <div className="flex flex-wrap gap-2">
            {stats.topTags.map(({ tag, count }) => (
              <span
                key={tag}
                className="px-3 py-1.5 bg-[#1A1A1A] rounded-xl text-[12px] text-[#999] border border-white/5"
              >
                {tag} <span className="text-[#666]">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
