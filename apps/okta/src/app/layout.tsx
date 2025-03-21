import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Elba x Okta',
  description: 'Elba x Okta',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
