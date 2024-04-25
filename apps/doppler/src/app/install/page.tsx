'use client';

import {
  Form,
  FormErrorMessage,
  FormField,
  FormLabel,
  Input,
  InstructionsStep,
  InstructionsSteps,
  SubmitButton,
} from '@elba-security/design-system';
import { useSearchParams } from 'next/navigation';
import { useFormState } from 'react-dom';
import type { FormState } from './actions';
import { install } from './actions';

export default function InstallPage() {
  const searchParams = useSearchParams();
  const organisationId = searchParams.get('organisation_id');
  const region = searchParams.get('region');

  const [state, formAction] = useFormState<FormState, FormData>(install, {});

  return (
    <>
      <h1>Setup Doppler integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <h3>How to Generate an API Key</h3>
          <ol>
            <li>
              <strong>1. Log in to Your Account</strong>
              <p>Access the platform by entering your credentials to log in.</p>
            </li>
            <li>
              <strong>2. Navigate to Tokens</strong>
              <p>
                Click on the <strong>Tokens</strong> menu located in the side navigation bar.
              </p>
            </li>
            <li>
              <strong>3. Access the Service Tab</strong>
              <p>
                Within the Tokens menu, select the <strong>Service</strong> tab.
              </p>
            </li>
            <li>
              <strong>4. Manage Service Accounts</strong>
              <p>
                Click on <strong>Manage Service Accounts</strong> to view and manage existing
                accounts.
              </p>
            </li>
            <li>
              <strong>5. Create a New Service Account</strong>
              <p>
                Click on <strong>Create Service Account</strong>.
              </p>
              <ul>
                <li>Enter a name for the new service account.</li>
                <li>
                  Click <strong>Create Service Account</strong> to proceed.
                </li>
              </ul>
            </li>
            <li>
              <strong>6. Assign Roles</strong>
              <p>
                Initially, the role will be set to <strong>None</strong>. To change this, proceed to
                the next steps.
              </p>
            </li>
            <li>
              <strong>7. Configure Workplace Role</strong>
              <p>
                Locate the <strong>Workplace Role</strong> section.
              </p>
              <ul>
                <li>
                  Change the role to <strong>Admin</strong> and then click <strong>Save</strong>.
                </li>
              </ul>
            </li>
            <li>
              <strong>8. Set Project Access</strong>
              <p>
                Under <strong>Project Access</strong>, select the projects to which you want the
                service account to have access.
              </p>
              <ul>
                <li>
                  9. Click <strong>Save</strong> to confirm the selections.
                </li>
              </ul>
            </li>
            <li>
              <strong>10. Generate API Token</strong>
              <p>
                Navigate to <strong>Create Service Account API Tokens</strong>.
              </p>
              <ul>
                <li>Provide a name for the token.</li>
                <li>Ensure you do not set an expiration date for the token.</li>
              </ul>
            </li>
          </ol>
        </InstructionsStep>
        <InstructionsStep index={2}>
          <h3>Connect Doppler</h3>
          <Form action={formAction}>
            <FormField isInvalid={Boolean(state.errors?.apiKey?.at(0))}>
              <FormLabel>API Key</FormLabel>
              <Input minLength={1} name="apiKey" placeholder="Paste Your API Key" type="text" />
              {state.errors?.apiKey?.at(0) ? (
                <FormErrorMessage>{state.errors.apiKey.at(0)}</FormErrorMessage>
              ) : null}
            </FormField>

            {organisationId !== null && (
              <input name="organisationId" type="hidden" value={organisationId} />
            )}
            {region !== null && <input name="region" type="hidden" value={region} />}

            <SubmitButton>Install</SubmitButton>
          </Form>
        </InstructionsStep>
      </InstructionsSteps>
    </>
  );
}
