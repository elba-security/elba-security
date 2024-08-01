import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Elba x Elastic',
  description: 'Official Elba x Elastic integration.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
