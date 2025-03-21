import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Elba x Pandadoc',
  description: 'Elba x Pandadoc',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
