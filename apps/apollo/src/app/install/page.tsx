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
      <h1>Setup Apollo integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <h3>Create an API client in Apollo to link to Elba</h3>
          <p>
            1. Launch Apollo and click <b>Settings</b> {'>'} <b>Integrations</b>.
          </p>
          <p>
            2. Find the <b>API</b> option and click <b>Connect</b>.
          </p>
          <p>
            3. Click <b>API Keys</b> to view or create new API keys. Then, click{' '}
            <b>Create New Key</b> to generate a new API Key.
          </p>
          <p>4. Name your API Key and add a description.</p>
          <p>
            5. Click <b>Create API Key</b>.
          </p>
        </InstructionsStep>
        <InstructionsStep index={2}>
          <h3>Connect Apollo</h3>
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
