import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, iconPosition = 'left', leftIcon, rightIcon, ...props }, ref) => {
    const resolvedLeftIcon = leftIcon || (iconPosition === 'left' ? icon : undefined);
    const resolvedRightIcon = rightIcon || (iconPosition === 'right' ? icon : undefined);

    return (
      <div className="w-full">
        {label && (
          <label className="block text-[#999] text-[13px] font-medium uppercase tracking-wide mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {resolvedLeftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666]">
              {resolvedLeftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full h-14 px-4 bg-[#0A0A0A] rounded-xl text-white placeholder:text-[#666]',
              'border border-[#1A1A1A] focus:border-white/30 focus:bg-[#111111] focus:outline-none',
              'transition-all duration-200',
              resolvedLeftIcon && 'pl-12',
              resolvedRightIcon && 'pr-12',
              error && 'border-[#EF4444]',
              className
            )}
            {...props}
          />
          {resolvedRightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#666]">
              {resolvedRightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-[13px] text-[#EF4444]">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-[#999] text-[13px] font-medium uppercase tracking-wide mb-2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'w-full px-4 py-3 bg-[#0A0A0A] rounded-xl text-white placeholder:text-[#666]',
            'border border-[#1A1A1A] focus:border-white/30 focus:bg-[#111111] focus:outline-none',
            'transition-all duration-200 resize-none min-h-[120px]',
            error && 'border-[#EF4444]',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-[13px] text-[#EF4444]">{error}</p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
