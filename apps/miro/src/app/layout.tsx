import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Elba x Miro',
  description: 'Elba x Miro',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
