import React from 'react';
import { cn } from '../../lib/utils';
import { TrendingUp, TrendingDown, Minus } from '../icons';
import type { IconProps } from '../icons';

interface StatCardNewProps {
  label: string;
  value: string | number;
  suffix?: string;
  icon?: React.FC<IconProps>;
  trend?: 'up' | 'down' | 'neutral';
  highlight?: boolean;
  className?: string;
}

export function StatCardNew({
  label,
  value,
  suffix,
  icon: Icon,
  trend,
  highlight = false,
  className,
}: StatCardNewProps) {
  const trendColors = {
    up: 'text-[#22C55E]',
    down: 'text-[#EF4444]',
    neutral: 'text-[#666]',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        'bg-[#0A0A0A] rounded-2xl p-4 border transition-all duration-200',
        highlight ? 'border-white/20' : 'border-[#1A1A1A]',
        className
      )}
    >
      <div className="flex items-center gap-1.5 mb-2">
        {Icon && <Icon className="w-4 h-4 text-[#666]" />}
        <span className="text-[#666] text-[12px] uppercase tracking-wide font-medium">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[28px] font-bold tracking-tight text-white">
          {value}
        </span>
        {suffix && (
          <span className="text-[#666] text-[14px] font-medium">{suffix}</span>
        )}
      </div>
      {trend && (
        <div className={cn('flex items-center gap-1 mt-1', trendColors[trend])}>
          <TrendIcon className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
  );
}
