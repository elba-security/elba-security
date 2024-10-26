import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Elba x Make',
  description: 'Integrate Make with Elba to automate your workflows.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
