import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, children, className = '' }: CardProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-flash-600/25 bg-gradient-to-b from-felt-700/80 to-felt-800/90 p-3 shadow-[0_14px_30px_rgba(0,0,0,0.3)] before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_right,rgba(0,191,255,0.12),transparent_45%)] after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_bottom_left,rgba(201,168,76,0.08),transparent_40%)] sm:p-4 sm:shadow-[0_18px_40px_rgba(0,0,0,0.35)] ${className}`}
    >
      {title ? (
        <h2 className="mb-2 font-display text-xl uppercase leading-none tracking-[0.09em] text-ivory-100 sm:mb-3 sm:text-2xl">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}
