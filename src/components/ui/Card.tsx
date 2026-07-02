import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, children, className = '' }: CardProps) {
  return (
    <section className={`rounded-2xl border border-felt-600 bg-felt-700/80 p-4 shadow-xl ${className}`}>
      {title ? <h2 className="mb-3 text-lg font-semibold text-ivory-100">{title}</h2> : null}
      {children}
    </section>
  );
}
