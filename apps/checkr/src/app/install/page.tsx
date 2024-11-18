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
      <h1>Setup checkr integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <h3>Create Api Key</h3>
          <p>
            1. Go to <strong>Account Settings</strong>
            {' > '}
            <strong>Developer Settings</strong> in the Checkr Dashboard
          </p>
          <p>
            2. In the <strong>Api keys</strong> section, click <strong>+ Create api key</strong>.
          </p>
          <p>
            3. Use the <strong>Secret Key</strong> within your staging and production environments.
          </p>
        </InstructionsStep>
        <InstructionsStep index={2}>
          <h3>Connect checkr</h3>
          <Form action={formAction}>
            <FormField isInvalid={Boolean(state.errors?.apiKey?.at(0))}>
              <FormLabel>Api Key</FormLabel>
              <Input minLength={1} name="apiKey" placeholder="Paste Your Api Key" type="text" />
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
