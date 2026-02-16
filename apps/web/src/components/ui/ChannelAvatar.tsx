import { useState } from 'react';

interface ChannelAvatarProps {
  photoUrl?: string;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  rounded?: 'default' | 'full';
  className?: string;
}

const sizeMap = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-14 h-14 text-xl',
  xl: 'w-20 h-20 text-2xl',
};

export function ChannelAvatar({
  photoUrl,
  title,
  size = 'lg',
  rounded = 'default',
  className = ''
}: ChannelAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const showFallback = !photoUrl || imageError;

  const sizeClass = sizeMap[size];
  const radiusClass = rounded === 'full' || size === 'xl' ? 'rounded-full' : 'rounded-2xl';

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      {showFallback ? (
        <div
          className={`${sizeClass} ${radiusClass} bg-[#1A1A1A] flex items-center justify-center text-white font-bold`}
        >
          {title?.charAt(0)?.toUpperCase() || 'C'}
        </div>
      ) : (
        <img
          src={photoUrl}
          alt={title}
          className={`${sizeClass} ${radiusClass} object-cover bg-[#1A1A1A]`}
          onError={() => setImageError(true)}
        />
      )}
    </div>
  );
}
