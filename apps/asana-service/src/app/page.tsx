'use client';
import { useEffect, useState } from 'react';
import ErrorPage from './error';

export default () => {
  const [error, setError] = useState<(Error & { digest?: string }) | null>(null);

  // Construct the Asana OAuth URL
  const asanaAuthUrl = `https://app.asana.com/-/oauth_authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_ASANA_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_REDIRECT_URI}&state=${process.env.NEXT_PUBLIC_ORGANISATION_ID}`;

  useEffect(() => {
    try {
      // Redirect to Asana's OAuth page
      window.location.href = asanaAuthUrl;
    } catch (error) {
      setError(error as Error & { digest?: string });
    }
  }, []);

  return (
    <main>
      {error ? <ErrorPage error={new Error()} reset={() => {}} /> : 'Redirecting to Asana...'}
    </main>
  );
};
