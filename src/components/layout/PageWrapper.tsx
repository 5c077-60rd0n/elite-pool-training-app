import type { ReactNode } from 'react';

interface PageWrapperProps {
  title: string;
  children: ReactNode;
}

export function PageWrapper({ title, children }: PageWrapperProps) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-4 sm:px-6">
      <div className="mb-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-flash-400">Flash Gordon Pool System</p>
        <h1 className="font-display text-4xl uppercase leading-none tracking-[0.08em] text-ivory-100">{title}</h1>
        <div className="mt-2 h-1 w-28 rounded-full bg-gradient-to-r from-flash-500 via-flash-400 to-cue-500" />
      </div>
      {children}
    </main>
  );
}
