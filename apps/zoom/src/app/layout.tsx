import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Elba x Zoom',
  description: 'Elba x Zoom',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
