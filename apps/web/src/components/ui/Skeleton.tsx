import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-[20px]',
  };

  const style = {
    width,
    height,
  };

  return (
    <div
      className={cn(
        'bg-gradient-to-r from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] bg-[length:200%_100%] animate-pulse',
        variantClasses[variant],
        className
      )}
      style={style}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-[20px] p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <Skeleton height={12} />
      <Skeleton width="80%" height={12} />
    </div>
  );
}

export function ChannelCardSkeleton() {
  return (
    <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-[20px] p-4">
      <div className="flex items-start gap-3">
        <Skeleton variant="circular" width={56} height={56} />
        <div className="flex-1 space-y-2">
          <Skeleton width="70%" height={18} />
          <Skeleton width="50%" height={14} />
          <div className="flex gap-2 mt-2">
            <Skeleton width={60} height={24} className="rounded-full" />
            <Skeleton width={80} height={24} className="rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-[20px] p-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
        <Skeleton width={60} height={20} />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-3 text-center space-y-2">
      <Skeleton width={48} height={28} className="mx-auto" />
      <Skeleton width="80%" height={12} className="mx-auto" />
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3].map((i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}
