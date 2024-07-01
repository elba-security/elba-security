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
      <h1>Setup Statsig integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <h3>Generate an API Key</h3>
          <p>
            1. On your Statsig <strong>My account</strong>, Navigate to the Statsig Console
          </p>
          <p>
            2. Click <strong>Project</strong> and select <strong>Keys & Environments</strong>
          </p>
          <p>
            3. Click <strong>Generate New Key</strong> select <strong>Console</strong>, add a
            description and select <strong>Production</strong> environment select{' '}
            <strong>Create</strong>
          </p>
          <p>4. Copy the created key to the form bellow</p>
        </InstructionsStep>
        <InstructionsStep index={2}>
          <h3>Connect Statsig</h3>
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
