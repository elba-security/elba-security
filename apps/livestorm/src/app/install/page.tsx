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
      <h1>Setup Livestorm integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <h3>How to Generate Token</h3>
          <p>1. In the Livestorm Dashboard, use the left navigation bar.</p>
          <p>
            2. Navigate to{' '}
            <b>
              Account {'>'} Account Settings {'>'} Public API {'>'} Token Management
            </b>
          </p>
          <p>3. Click on new Token.</p>
          <p>4. Give your API Token a name.</p>
          <p>5.Select Admin write permission fro the token</p>
          <p>
            8. Click Generate a Token (The token maybe blocked in default, you should demand the
            Livestorm to unblock it)
          </p>
        </InstructionsStep>
        <InstructionsStep index={2}>
          <h3>Connect Doppler</h3>
          <Form action={formAction}>
            <FormField isInvalid={Boolean(state.errors?.token?.at(0))}>
              <FormLabel>API Key</FormLabel>
              <Input minLength={1} name="token" placeholder="Paste Your Token" type="text" />
              {state.errors?.token?.at(0) ? (
                <FormErrorMessage>{state.errors.token.at(0)}</FormErrorMessage>
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
