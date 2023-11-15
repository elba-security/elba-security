import { type ReactNode, Suspense } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<span>connecting to your github organization...</span>}>
      {children}
    </Suspense>
  );
}
