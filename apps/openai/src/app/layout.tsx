import type { Metadata } from 'next';
import '@elba-security/design-system/dist/styles.css';

export const metadata: Metadata = {
  title: 'Elba x OpenAI',
  description: 'Official Elba x OpenAI integration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
