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
      <h1>Setup Launchdarkly integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <h3>Create Personal Access Token</h3>
          <p>
            1. On your Launchdarkly account, Navigate to the Account settings page and Click into
            the <b>Authorization</b> tab.
          </p>
          <p>
            2. Click <b>Create token</b>. Give your token a human-readable Name and Assign a Role to
            the token by choosing one from the menu.
          </p>
          <p>
            3. Click <b>Save</b> token and copy it.
          </p>
        </InstructionsStep>
        <InstructionsStep index={2}>
          <h3>Connect Launchdarkly</h3>
          <Form action={formAction}>
            <FormField isInvalid={Boolean(state.errors?.apiKey?.at(0))}>
              <FormLabel>API Token</FormLabel>
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
