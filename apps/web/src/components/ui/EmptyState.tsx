import React, { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import type { IconProps } from '../icons/types';
import { useTranslation } from '../../i18n';

interface EmptyStateProps {
  icon?: React.FC<IconProps> | ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: IconOrNode,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const renderIcon = () => {
    if (!IconOrNode) return null;

    if (typeof IconOrNode === 'function') {
      const Icon = IconOrNode as React.FC<IconProps>;
      return <Icon className="w-8 h-8 text-[#666]" />;
    }

    return <div className="text-[#666]">{IconOrNode}</div>;
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-6 text-center',
        className
      )}
    >
      {IconOrNode && (
        <div className="w-20 h-20 rounded-3xl bg-[#111111] border border-[#1A1A1A] flex items-center justify-center mb-4">
          {renderIcon()}
        </div>
      )}
      <h3 className="text-white text-[20px] font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-[#666] text-[15px] max-w-[280px]">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} size="lg" className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title,
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  const { t } = useTranslation();
  const displayTitle = title || t('common.error');
  const displayMessage = message || t('common.errorLoadingDesc');
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-6 text-center',
        className
      )}
    >
      <div className="w-20 h-20 rounded-3xl bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-[#EF4444]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-white text-[20px] font-semibold mb-1">{displayTitle}</h3>
      <p className="text-[#666] text-[15px] max-w-[280px]">{displayMessage}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary" size="lg" className="mt-4">
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}
