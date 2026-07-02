import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}

export function Button({ children, className = '', variant = 'primary', ...props }: ButtonProps) {
  const base = 'min-h-11 min-w-11 rounded-xl px-4 py-2 text-base font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cue-400';
  const style =
    variant === 'primary'
      ? 'bg-cue-500 text-felt-900 hover:bg-cue-400'
      : 'border border-felt-600 bg-felt-700 text-ivory-100 hover:bg-felt-600';

  return (
    <button className={`${base} ${style} ${className}`} {...props}>
      {children}
    </button>
  );
}
