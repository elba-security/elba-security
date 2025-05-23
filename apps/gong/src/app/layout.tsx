import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Elba x Gong',
  description: 'Elba x Gong integration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
