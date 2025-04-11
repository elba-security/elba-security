import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Elba x Metabase',
  description: 'Elba x Metabase integration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
