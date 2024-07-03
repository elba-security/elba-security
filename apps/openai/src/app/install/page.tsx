'use client';

import React from 'react';
import { useFormState } from 'react-dom';
import { useSearchParams } from 'next/navigation';
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
import { install } from './actions';
import type { FormState } from './actions';

export default function InstallPage() {
  const searchParams = useSearchParams();
  const organisationId = searchParams.get('organisation_id');
  const region = searchParams.get('region');

  const [state, formAction] = useFormState<FormState, FormData>(install, {});

  return (
    <>
      <h1>Setup OpenAI integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <h3>Generate a service account API Key</h3>
          <p>
            To create and manage your API keys, visit your{' '}
            <a href="https://platform.openai.com/settings/organization/team">
              Organization members settings.
            </a>
          </p>
          <p>
            Click on <strong>+ Service account</strong> to add a new service account.
          </p>
          <p>Enter a service account ID.</p>
          <p>
            Click on <strong>Create</strong>
          </p>
          <p>
            Click on <strong>Copy</strong> to copy the API token that was generated for this service
            account.
          </p>
          <p>
            Click on <strong>Done</strong>
          </p>
          <p>
            In the list of users, find the service account that was just created and click on{' '}
            <strong>Reader</strong> role and change it to <strong>Owner</strong>
          </p>
          <p>
            Click on <strong>Change role</strong>
          </p>
        </InstructionsStep>

        <InstructionsStep index={2}>
          <h3>Connect OpenAI</h3>

          <Form action={formAction}>
            <FormField>
              <FormLabel>Service account API Key</FormLabel>
              <Input minLength={1} name="apiKey" placeholder="Paste your API Key" type="text" />
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
