import { useTelegram } from '../../providers/TelegramProvider';

interface ToggleProps {
  isEnabled: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ isEnabled, onChange, disabled }: ToggleProps) {
  const { hapticFeedback } = useTelegram();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isEnabled}
      disabled={disabled}
      onClick={() => { if (!disabled) { hapticFeedback('selection'); onChange(!isEnabled); } }}
      className={`relative inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer rounded-full transition-colors duration-300 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
        isEnabled
          ? 'bg-[#34C759]'
          : 'bg-[#39393D] border border-[#555]'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-lg transition-transform duration-300 ease-in-out ${
          isEnabled ? 'translate-x-[21px]' : 'translate-x-[2px]'
        } ${isEnabled ? 'mt-[2px]' : 'mt-[1px]'}`}
      />
    </button>
  );
}
