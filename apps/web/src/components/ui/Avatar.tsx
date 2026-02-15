import { useState } from 'react';
import { cn } from '../../lib/utils';
import { User } from '../icons';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export function Avatar({ src, alt, name, size = 'md', className }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  
  const sizes = {
    sm: 'w-10 h-10 rounded-xl text-sm',
    md: 'w-12 h-12 rounded-xl text-base',
    lg: 'w-14 h-14 rounded-2xl text-lg',
    xl: 'w-20 h-20 rounded-2xl text-2xl',
    '2xl': 'w-24 h-24 rounded-3xl text-3xl',
  };

  const getInitial = (name?: string) => {
    if (!name) return null;
    return name.charAt(0).toUpperCase();
  };

  const showImage = src && !imageError;

  if (showImage) {
    return (
      <img
        src={src}
        alt={alt || name || 'Avatar'}
        className={cn(
          'object-cover bg-[#1A1A1A] flex-shrink-0',
          sizes[size],
          className
        )}
        onError={() => setImageError(true)}
      />
    );
  }

  const initial = getInitial(name);

  return (
    <div
      className={cn(
        'bg-gradient-to-br from-[#2A2A2A] to-[#1A1A1A] flex items-center justify-center font-semibold flex-shrink-0',
        sizes[size],
        className
      )}
    >
      {initial ? (
        <span className="text-white">{initial}</span>
      ) : (
        <User size={size === 'sm' ? 20 : size === 'md' ? 24 : size === 'lg' ? 28 : size === 'xl' ? 40 : 48} className="text-[#666]" />
      )}
    </div>
  );
}

interface ChannelAvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  verified?: boolean;
  className?: string;
}

export function ChannelAvatar({ src, name, size = 'md', verified, className }: ChannelAvatarProps) {
  return (
    <div className={cn('relative', className)}>
      <Avatar src={src} name={name} size={size} className="rounded-xl" />
      {verified && (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center">
          <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
