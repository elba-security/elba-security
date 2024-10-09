import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Elba x Make',
  description: 'Official Elba x Make integration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
