import type { ReactNode } from 'react';

interface PageWrapperProps {
  title: string;
  children: ReactNode;
}

export function PageWrapper({ title, children }: PageWrapperProps) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-4 sm:px-6">
      <h1 className="mb-4 text-2xl font-bold text-ivory-100">{title}</h1>
      {children}
    </main>
  );
}
