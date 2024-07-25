import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Elba x Launchdarkly',
  description: 'Official Elba x Launchdarkly integration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
