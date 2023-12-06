'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ErrorPage from '../../error';
import axios from 'axios';

// redirected page from asana authentication
export default function Page() {
  const [error, setError] = useState<(Error & { digest?: string }) | null>(null);

  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const organisation_id = searchParams.get('state');
  const errorMessage = searchParams.get('error');

  useEffect(() => {
    if (errorMessage)
      setError({
        name: 'Error',
        message: errorMessage,
      });

    const exchangeCodeToToken = async () => {
      try {
        const response = await axios.post(
          '/api/exchange-token',
          {
            code: code,
            organisation_id: organisation_id,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (err) {
        if (err instanceof Error) {
          setError(err);
        }
      }
    };

    if (code && organisation_id && !errorMessage) {
      exchangeCodeToToken();
    }
  }, []);

  return <main>{error ? <ErrorPage error={error} reset={() => {}} /> : 'Success!'}</main>;
}
