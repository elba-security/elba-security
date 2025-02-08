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
      <h1>Setup Sendgrid integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <h3>Generate an API Key</h3>
          <p>1. Log into your SendGrid account</p>
          <p>
            2. From the left side menu, click on <strong>Settings</strong>, then on{' '}
            <strong>API Keys</strong>
          </p>
          <p>
            3. Click the <strong>Create API Key</strong>
          </p>
          <p>
            4. Give a API key name and select the <strong>Full Access</strong> permission
          </p>
          <p>
            6. Click the <strong>Create & View button</strong>. You will be presented with your
            SendGrid API key.
          </p>
        </InstructionsStep>
        <InstructionsStep index={2}>
          <h3>Connect Sendgrid</h3>
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
