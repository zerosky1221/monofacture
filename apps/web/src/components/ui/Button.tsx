import React, { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from '../icons';
import type { IconProps } from '../icons/types';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.FC<IconProps>;
  children?: ReactNode;
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading,
      isLoading,
      icon: Icon,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isLoadingState = loading || isLoading || false;

    const baseClasses =
      'inline-flex items-center justify-center font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';

    const variants = {
      primary: 'bg-white text-black hover:bg-[#E5E5E5] active:bg-[#CCCCCC]',
      secondary:
        'bg-[#141414] text-white border border-[#2A2A2A] hover:bg-[#1A1A1A] hover:border-[#333]',
      ghost: 'bg-transparent text-white hover:bg-white/5',
      danger:
        'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20 hover:bg-[#EF4444]/20',
    };

    const sizes = {
      sm: 'h-10 px-4 text-[14px] rounded-xl gap-2',
      md: 'h-12 px-5 text-[15px] rounded-xl gap-2',
      lg: 'h-14 px-6 text-[16px] rounded-2xl gap-2',
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || isLoadingState}
        {...props}
      >
        {isLoadingState ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            {Icon && <Icon className="w-5 h-5" />}
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
