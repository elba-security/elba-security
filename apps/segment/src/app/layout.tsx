import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Elba x Segment',
  description: 'Elba x Segment integration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
