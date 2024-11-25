'use client';

import { Alert, Button } from '@elba-security/design-system';
import { useSearchParams } from 'next/navigation';
import { redirectTo } from './actions';

export default function Error() {
  const errorMessages: Record<string, string> = {
    not_admin: 'The account you connected with is not admin',
  };
  const searchParams = useSearchParams();
  const errorType = searchParams.get('error');
  const errorMessage = (errorType && errorMessages[errorType]) || 'An unknown error occurred';

  return (
    <>
      <h1 style={{ textAlign: 'center' }}>An error has occurred</h1>
      <Alert status="error">{errorMessage}</Alert>
      <div className="mt-3 self-center">
        <Button
          className="my-3"
          variant="secondary"
          onClick={() => redirectTo('elba')}
          style={{ marginRight: '8px' }}>
          Back to elba
        </Button>
        <Button onClick={() => redirectTo('install')}>Setup Docusign</Button>
      </div>
    </>
  );
}
