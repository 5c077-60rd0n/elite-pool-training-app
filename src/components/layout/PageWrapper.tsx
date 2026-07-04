import type { ReactNode } from 'react';

interface PageWrapperProps {
  title: string;
  children: ReactNode;
}

export function PageWrapper({ title, children }: PageWrapperProps) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-3 sm:px-6 sm:pb-24 sm:pt-4">
      <div className="mb-3 sm:mb-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-flash-400">Flash Gordon Pool System</p>
        <h1 className="font-display text-3xl uppercase leading-none tracking-[0.08em] text-ivory-100 sm:text-4xl">{title}</h1>
        <div className="mt-1.5 h-1 w-24 rounded-full bg-gradient-to-r from-flash-500 via-flash-400 to-cue-500 sm:mt-2 sm:w-28" />
      </div>
      {children}
    </main>
  );
}
