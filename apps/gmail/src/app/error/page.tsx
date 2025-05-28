'use client';

import { Alert, Button } from '@elba-security/design-system';
import { useSearchParams } from 'next/navigation';
import { redirectTo } from './actions';

export default function Error() {
  const errorMessages: Record<string, string> = {
    not_admin: 'The account you connected with is not super admin of the Google Workspace',
    gdrive_access_restricted:
      'Google Drive access restricted, make sure "Service status" and "Drive SDK" are "ON" in your Google workspace "Drive and Docs" settings',
  };
  const searchParams = useSearchParams();
  const errorType = searchParams.get('error');
  const errorMessage = (errorType && errorMessages[errorType]) || 'An unknown error occurred';

  return (
    <>
      <h1>An error has occurred</h1>
      <Alert status="error">{errorMessage}</Alert>
      <div className="mt-4 self-center space-x-3">
        <Button variant="secondary" onClick={() => redirectTo('elba')}>
          Back to elba
        </Button>
        <Button onClick={() => redirectTo('install')}>Setup Google</Button>
      </div>
    </>
  );
}
