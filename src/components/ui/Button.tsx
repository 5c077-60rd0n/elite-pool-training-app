import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}

export function Button({ children, className = '', variant = 'primary', ...props }: ButtonProps) {
  const base =
    'min-h-12 min-w-12 rounded-xl px-5 py-2.5 font-body text-sm font-semibold uppercase tracking-[0.08em] transition duration-150 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cue-400';
  const style =
    variant === 'primary'
      ? 'border border-flash-400/70 bg-gradient-to-b from-flash-400 to-flash-600 text-felt-900 shadow-[0_8px_22px_rgba(0,191,255,0.3)] hover:brightness-105'
      : 'border border-cue-600/45 bg-felt-700/85 text-cue-400 hover:border-cue-500/70 hover:bg-felt-600/90 hover:text-cue-300';

  return (
    <button className={`${base} ${style} ${className}`} {...props}>
      {children}
    </button>
  );
}
