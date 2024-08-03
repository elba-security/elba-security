'use client';

import React from 'react';
import { useFormState } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import {
  InstructionsSteps,
  InstructionsStep,
  Form,
  SubmitButton,
  FormField,
  FormLabel,
  Input,
  FormErrorMessage,
} from '@elba-security/design-system';
import { install } from './actions';
import type { FormState } from './actions';

export default function InstallPage() {
  const searchParams = useSearchParams();
  const organisationId = searchParams.get('organisation_id');
  const region = searchParams.get('region');

  const [state, formAction] = useFormState<FormState, FormData>(install, {});

  return (
    <>
      <h1>Setup Elastic integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <h3>Generate API Key</h3>
          <p>Click on your avatar in the upper right corner and select Organization</p>
          <p>
            On the API keys tab of the <strong>Organization</strong> page, click{' '}
            <strong>Create API Key</strong>.
          </p>
          <p>
            In the Create API Key page, you can configure your new key by adding a name, set a large
            expiration date (you will have to reconnect the integration after expiration) and assign{' '}
            <strong>Organization owner</strong> role.
          </p>
          <p>
            Click <strong>Create API key</strong>, copy the generated API key, and paste it in the
            form below.
          </p>
        </InstructionsStep>
        <InstructionsStep index={2}>
          <h3>Connect Elastic</h3>
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
