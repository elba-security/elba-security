import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Elba x Dbtlabs',
  description: 'Official Elba x Dbtlabs integration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
