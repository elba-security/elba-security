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
      <h1>Setup Datadog integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <h3>How to generate api key?</h3>
          <p>1. Log in to you account and navigate to API Keys</p>
          <p>2. Click Create API Key.</p>
          <p>
            3. Give your API Key a name. For example, <b>elba-security</b> and create. Make sure to
            copy the key.
          </p>
        </InstructionsStep>
        <InstructionsStep index={2}>
          <h3>How to get your application key?</h3>
          <p>1. 1. Log in to you account and navigate to Application Keys.</p>
          <p>2. Click Create Application Key.</p>
          <p>3. Give your Application Key a name. Make sure to copy the key.</p>
        </InstructionsStep>
        <InstructionsStep index={3}>
          <h3>Connect Datadog</h3>
          <Form action={formAction}>
            <FormField isInvalid={Boolean(state.errors?.apiKey?.at(0))}>
              <FormLabel>API Key</FormLabel>
              <Input minLength={1} name="apiKey" placeholder="Paste Your Key" type="text" />
              {state.errors?.apiKey?.at(0) ? (
                <FormErrorMessage>{state.errors.apiKey.at(0)}</FormErrorMessage>
              ) : null}
            </FormField>
            <FormField isInvalid={Boolean(state.errors?.appKey?.at(0))}>
              <FormLabel>Your Application Key</FormLabel>
              <Input
                minLength={1}
                name="appKey"
                placeholder="Paste Your Application Key"
                type="text"
              />
              {state.errors?.appKey?.at(0) ? (
                <FormErrorMessage>{state.errors.appKey.at(0)}</FormErrorMessage>
              ) : null}
            </FormField>
            <FormField isInvalid={Boolean(state.errors?.sourceRegion?.at(0))}>
              <FormLabel>Your Region</FormLabel>
              <Input minLength={1} name="sourceRegion" placeholder="US or EU" type="text" />
              {state.errors?.sourceRegion?.at(0) ? (
                <FormErrorMessage>{state.errors.sourceRegion.at(0)}</FormErrorMessage>
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
