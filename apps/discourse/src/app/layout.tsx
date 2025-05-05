import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Elba x Discourse',
  description: 'Elba x Discourse integration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
