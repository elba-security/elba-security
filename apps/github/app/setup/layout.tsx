import { ReactNode, Suspense } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <main>
      <Suspense fallback={<span>connecting to your github organization...</span>}>
        {children}
      </Suspense>
    </main>
  );
}
