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
      <h1>Setup Jumpcloud integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <h3>Create an API client in Jumpcloud to link to Elba</h3>
          <p>1. Log in to JumpCloud as an Administrator</p>
          <p>
            2. In the Admin Portal, click your account initials displayed in the top-right and
            select <b>My API Key</b> from the drop down menu.
          </p>
          <p>
            3. If you haven’t generated an API key yet, you will have the option to{' '}
            <b>Generate New API Key</b> . Please note that only Admins with Billing role can enable
            API access.
          </p>
          <p>4. Copy the API Key and paste them below. (You will not see them again)</p>
        </InstructionsStep>
        <InstructionsStep index={2}>
          <h3>Connect Jumpcloud</h3>
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
