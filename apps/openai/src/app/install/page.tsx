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
          <h3>Generate API Key</h3>
          <p>
            To create and manage your API keys, visit your{' '}
            <a href="https://platform.openai.com/api-keys">User settings.</a>
          </p>
          <p>Click Create new secret key.</p>
          <p>Give your API key a name.</p>
          <p>
            Select <strong>All</strong> under Permissions.
          </p>
          <p>
            Click <strong>Create secret key</strong> and then <strong>Copy your Key</strong>.
          </p>
        </InstructionsStep>

        <InstructionsStep index={2}>
          <h3>Retrieve Organization ID</h3>
          <p>
            To find your Organization Id, visit your{' '}
            <a href="https://platform.openai.com/settings/organization/general">
              Organization settings.
            </a>
          </p>
          <p>
            Select <strong>Organization</strong>.
          </p>
          <p>Copy the Organization Id.</p>
        </InstructionsStep>
        <InstructionsStep index={3}>
          <h3>Connect OpenAI</h3>

          <Form action={formAction}>
            <FormField>
              <FormLabel>API Key</FormLabel>
              <Input minLength={1} name="apiKey" placeholder="Paste your API Key" type="text" />
              {state.errors?.apiKey?.at(0) ? (
                <FormErrorMessage>{state.errors.apiKey.at(0)}</FormErrorMessage>
              ) : null}
            </FormField>
            <FormField>
              <FormLabel>Organization Id</FormLabel>
              <Input
                minLength={1}
                name="sourceOrganizationId"
                placeholder="Paste your organization ID"
                type="text"
              />
              {state.errors?.sourceOrganizationId?.at(0) ? (
                <FormErrorMessage>{state.errors.sourceOrganizationId.at(0)}</FormErrorMessage>
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
