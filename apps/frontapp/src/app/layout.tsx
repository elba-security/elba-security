import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Elba x Frontapp',
  description: 'Elba x Frontapp integration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
