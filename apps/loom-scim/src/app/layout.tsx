/**
 * This file is required by nextjs and has no purpose for now in the integration.
 * It should not be edited or removed.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Elba x loom-scim`,
  description: 'Elba x loom-scim',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
