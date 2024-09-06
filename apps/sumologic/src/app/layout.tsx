import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Elba x Sumologic',
  description: 'Official Elba x Sumologic integration.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
