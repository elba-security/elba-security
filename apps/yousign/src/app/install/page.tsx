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
      <h1>Setup Yousign integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <h3>How to Generate API Key</h3>
          <p>1. Log in to your account.</p>
          <p>2. Navigate to the left navigation bar, and then select Integrations {'>'} API</p>
          <p>3. New API Key</p>
          <p>4. Give your API key a Description.</p>
          <p>5. Create API Key and copy.</p>
        </InstructionsStep>
        <InstructionsStep index={2}>
          <h3>Connect Yousign</h3>
          <Form action={formAction}>
            <FormField isInvalid={Boolean(state.errors?.apiKey?.at(0))}>
              <FormLabel>API Token</FormLabel>
              <Input minLength={1} name="apiKey" placeholder="Paste Your Token" type="text" />
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
