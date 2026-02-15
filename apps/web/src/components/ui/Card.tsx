import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { ChevronRight } from '../icons';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'interactive' | 'accent';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  gradient?: boolean;
  elevated?: boolean;
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  className,
  onClick,
  gradient = false,
  elevated = false,
}: CardProps) {
  const resolvedVariant = gradient
    ? 'accent'
    : elevated
      ? 'elevated'
      : variant;

  const variants = {
    default: 'bg-[#0A0A0A] border border-[#1A1A1A]',
    elevated: 'bg-[#111111] border border-[#1A1A1A] shadow-lg',
    interactive:
      'bg-[#0A0A0A] border border-[#1A1A1A] hover:bg-[#111111] hover:border-[#2A2A2A] active:bg-[#141414] cursor-pointer',
    accent:
      'bg-[#0A0A0A] border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)]',
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  const classes = cn(
    'rounded-[20px] transition-all duration-200',
    variants[resolvedVariant],
    paddings[padding],
    onClick && resolvedVariant !== 'interactive' && 'cursor-pointer active:scale-[0.98]',
    className
  );

  if (onClick) {
    return (
      <button className={cn(classes, 'w-full text-left')} onClick={onClick}>
        {children}
      </button>
    );
  }

  return <div className={classes}>{children}</div>;
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-3', className)}>
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {subtitle && (
          <p className="text-sm text-[#999] mt-0.5">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

interface ListItemProps {
  icon?: ReactNode;
  iconBg?: string;
  title: string;
  subtitle?: string;
  value?: string | ReactNode;
  onClick?: () => void;
  showArrow?: boolean;
  className?: string;
}

export function ListItem({
  icon,
  iconBg = 'bg-[#1A1A1A]',
  title,
  subtitle,
  value,
  onClick,
  showArrow = true,
  className,
}: ListItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl transition-all duration-200',
        onClick && 'cursor-pointer hover:bg-[#111111] active:bg-[#141414]',
        className
      )}
      onClick={onClick}
    >
      {icon && (
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            iconBg
          )}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] text-white truncate">{title}</p>
        {subtitle && (
          <p className="text-[13px] text-[#999] truncate mt-0.5">{subtitle}</p>
        )}
      </div>
      {value && (
        <div className="text-[13px] text-[#999] flex-shrink-0">{value}</div>
      )}
      {onClick && showArrow && (
        <ChevronRight className="w-5 h-5 text-[#666] flex-shrink-0" />
      )}
    </div>
  );
}

interface StatCardProps {
  value: string | number;
  label: string;
  icon?: ReactNode;
  trend?: { value: number; isPositive: boolean };
  className?: string;
}

export function StatCard({ value, label, icon, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-3 text-center',
        className
      )}
    >
      {icon && <div className="mb-1">{icon}</div>}
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-[10px] text-[#999] mt-1 truncate">{label}</p>
      {trend && (
        <p
          className={cn(
            'text-xs mt-1',
            trend.isPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'
          )}
        >
          {trend.isPositive ? '+' : ''}
          {trend.value}%
        </p>
      )}
    </div>
  );
}

interface GradientBannerProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  gradient?: 'blue' | 'green' | 'purple' | 'orange' | 'gold' | 'white';
  className?: string;
}

export function GradientBanner({
  title,
  subtitle,
  action,
  gradient = 'white',
  className,
}: GradientBannerProps) {
  const gradients = {
    blue: 'bg-gradient-to-r from-[#3390ec] to-[#2563EB]',
    green: 'bg-gradient-to-r from-[#22C55E] to-[#16A34A]',
    purple: 'bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9]',
    orange: 'bg-gradient-to-r from-[#F59E0B] to-[#D97706]',
    gold: 'bg-gradient-to-r from-[#E5E5E5] to-[#CCCCCC]',
    white: 'bg-gradient-to-r from-white to-[#E5E5E5]',
  };

  const isLight = gradient === 'gold' || gradient === 'white';

  return (
    <div
      className={cn(
        'rounded-[20px] p-4',
        gradients[gradient],
        className
      )}
    >
      <h3 className={cn('text-lg font-bold', isLight ? 'text-black' : 'text-white')}>
        {title}
      </h3>
      {subtitle && (
        <p className={cn('text-sm mt-1', isLight ? 'text-black/60' : 'text-white/80')}>
          {subtitle}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
