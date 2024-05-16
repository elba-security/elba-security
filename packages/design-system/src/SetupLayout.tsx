import type { ReactNode } from 'react';

export type SetupLayoutProps = {
  children: ReactNode;
};

export function SetupLayout({ children }: SetupLayoutProps) {
  return <main className="flex flex-col h-full max-w-2xl py-10 px-5 m-auto">{children}</main>;
}
