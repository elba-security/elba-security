import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Elba x 15Five',
  description: 'Elba x 15Five integration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
