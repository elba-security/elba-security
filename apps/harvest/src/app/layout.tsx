import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Elba x Harvest',
  description: 'Elba x Harvest integration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
