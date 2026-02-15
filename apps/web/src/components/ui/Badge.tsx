import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../i18n';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

const variantAliasMap: Record<string, BadgeProps['variant']> = {
  danger: 'error',
  purple: 'info',
  gold: 'default',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className,
}: BadgeProps & { variant?: string }) {
  const resolvedVariant = (variantAliasMap[variant] || variant) as NonNullable<BadgeProps['variant']>;

  const variants = {
    default: 'bg-white/10 text-white',
    success: 'bg-[#22C55E]/15 text-[#22C55E]',
    error: 'bg-[#EF4444]/15 text-[#EF4444]',
    warning: 'bg-[#F59E0B]/15 text-[#F59E0B]',
    info: 'bg-[#3390ec]/15 text-[#3390ec]',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-3 py-1 text-[12px]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full transition-all duration-200',
        variants[resolvedVariant] || variants.default,
        sizes[size as 'sm' | 'md'] || sizes.sm,
        className
      )}
    >
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation();

  const getVariant = (status: string): BadgeProps['variant'] => {
    const successStatuses = [
      'COMPLETED',
      'VERIFIED',
      'ACTIVE',
      'POSTED',
      'PUBLISHED',
      'PAYMENT_RECEIVED',
      'CREATIVE_APPROVED',
    ];
    const warningStatuses = [
      'PENDING_PAYMENT',
      'PENDING_VERIFICATION',
      'CREATIVE_PENDING',
      'PAUSED',
      'SCHEDULED',
    ];
    const errorStatuses = [
      'DISPUTED',
      'SUSPENDED',
      'CANCELLED',
      'EXPIRED',
    ];
    const infoStatuses = [
      'CREATED',
      'IN_PROGRESS',
      'VERIFYING',
      'CREATIVE_SUBMITTED',
    ];

    if (successStatuses.includes(status)) return 'success';
    if (warningStatuses.includes(status)) return 'warning';
    if (errorStatuses.includes(status)) return 'error';
    if (infoStatuses.includes(status)) return 'info';
    return 'default';
  };

  const getLabel = (status: string): string => {
    const key = `deals.status.${status}`;
    const translated = t(key);
    return translated !== key ? translated : status;
  };

  return (
    <Badge variant={getVariant(status)} className={className}>
      {getLabel(status)}
    </Badge>
  );
}
