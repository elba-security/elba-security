/**
 * This file is required by nextjs and has no purpose for now in the integration.
 * It should not be edited or removed.
 */
import type { Metadata } from 'next';
import style from './layout.module.css';

export const metadata: Metadata = {
  title: 'Elba x Google',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={style.body}>{children}</body>
    </html>
  );
}
