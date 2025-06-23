import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Elba x outlook`,
  description: 'Elba x outlook',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
