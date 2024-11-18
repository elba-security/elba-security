'use client';

import { InstructionsSteps, Button } from '@elba-security/design-system';
import { useSearchParams } from 'next/navigation';
import { install } from './actions';

export default function InstallPage() {
  const searchParams = useSearchParams();

  const handleClick = () => {
    const organisationId = searchParams.get('organisation_id');
    const region = searchParams.get('region');
    install({ organisationId, region });
  };

  return (
    <>
      <h1>Setup Sentry integration</h1>
      <InstructionsSteps>
        <p>1. In the Sentry Dashboard, use the menu (left) and navigate to the Settings page.</p>
        <p>2. Click on the Integrations tab.</p>
        <p>3. Use the Filter Integrations bar to search for “Elba” and select it.</p>
        <p>4. Begin the installation by clicking the Install button.</p>
        <p>5. Once the installation completes you will be redirected back to the Elba.</p>
        <form>
          <Button onClick={handleClick}>Connect</Button>
        </form>
      </InstructionsSteps>
    </>
  );
}
