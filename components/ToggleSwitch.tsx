import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  label = 'Toggle setting',
  size = 'md',
  className = '',
}) => {
  const isSm = size === 'sm';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-money-500 focus:ring-offset-2 dark:focus:ring-offset-shark-900 ${
        isSm ? 'h-5 w-9' : 'h-6 w-11'
      } ${
        checked
          ? 'bg-money-600 dark:bg-money-500'
          : 'bg-slate-300 dark:bg-shark-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'} ${className}`}
    >
      <span className="sr-only">{label}</span>
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          isSm ? 'h-4 w-4' : 'h-5 w-5'
        } ${
          isSm
            ? checked
              ? 'translate-x-4'
              : 'translate-x-0'
            : checked
            ? 'translate-x-5'
            : 'translate-x-0'
        }`}
      />
    </button>
  );
};
