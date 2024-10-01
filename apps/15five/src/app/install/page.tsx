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
      <h1>Setup 15five integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <h3>Create API Key</h3>
          <p>In the 15five Dashboard, navigate to the Settings on the top-right corner</p>
          <p>
            you can see Company setting, click on the <strong>Integration</strong>
          </p>
          <p>
            After enabling <strong>Public API</strong>, Create the <strong>API Key</strong>.
          </p>
          <p>
            Copy the <strong>API Key</strong> and paste them in the fields below. Make sure to save
            them in a secure place.
          </p>
        </InstructionsStep>
        <InstructionsStep index={2}>
          <h3>Connect 15five</h3>
          <Form action={formAction}>
            <FormField isInvalid={Boolean(state.errors?.apiKey?.at(0))}>
              <FormLabel>API Key</FormLabel>
              <Input minLength={1} name="apiKey" placeholder="Paste Your API Key" type="text" />
              {state.errors?.apiKey?.at(0) ? (
                <FormErrorMessage>{state.errors.apiKey.at(0)}</FormErrorMessage>
              ) : null}
            </FormField>
            <FormField isInvalid={Boolean(state.errors?.email?.at(0))}>
              <FormLabel>Your Email</FormLabel>
              <Input
                minLength={1}
                name="email"
                placeholder="Paste Your Email Address"
                type="text"
              />
              {state.errors?.email?.at(0) ? (
                <FormErrorMessage>{state.errors.email.at(0)}</FormErrorMessage>
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
