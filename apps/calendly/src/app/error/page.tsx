'use client';
import React from 'react';
import { Button, Alert } from '@elba-security/design-system';
import { useSearchParams } from 'next/navigation';
import { redirectTo } from './actions';

export default function Error() {
  const errorMessages: Record<string, string> = {
    invalid_plan:
      'Elba does not support the Free (Basic) or Essentials plans. Please connect with an account that is on a supported plan for teams: Standard, Professional(legacy plan), Teams, or Enterprise.',
  };
  const searchParams = useSearchParams();
  const errorType = searchParams.get('error');
  const errorMessage = (errorType && errorMessages[errorType]) || 'An unknown error occurred';

  return (
    <>
      <h1>An error has occurred</h1>
      <b>
        <Alert status="error">{errorMessage}</Alert>
      </b>
      <div className="mt-4 self-center space-x-3">
        <Button variant="secondary" onClick={() => redirectTo('elba')}>
          Back to elba
        </Button>
        <Button onClick={() => redirectTo('install')}>Connect again</Button>
      </div>
    </>
  );
}
