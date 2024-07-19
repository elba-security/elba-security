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
      <h1>Setup Fivetran integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <h3>Create an API client in Fivetran to link to Elba</h3>
          <p>
            1. In the Fivetran Dashboard, use the menu (top-left) and navigate to{' '}
            <b>
              Your Username
              {' ->'} API key
            </b>
            .
          </p>
          <p>
            2. Click on the <b>Generate API Key button</b>
          </p>
          <p>
            3. Copy the API Key and API Secret and paste them below. (You will not see them again)
          </p>
        </InstructionsStep>
        <InstructionsStep index={2}>
          <h3>Connect Fivetran</h3>
          <Form action={formAction}>
            <FormField isInvalid={Boolean(state.errors?.apiKey?.at(0))}>
              <FormLabel>API Key</FormLabel>
              <Input minLength={1} name="apiKey" placeholder="Paste Your API Key" type="text" />
              {state.errors?.apiKey?.at(0) ? (
                <FormErrorMessage>{state.errors.apiKey.at(0)}</FormErrorMessage>
              ) : null}
            </FormField>
            <FormField isInvalid={Boolean(state.errors?.apiKey?.at(0))}>
              <FormLabel>API Secret</FormLabel>
              <Input minLength={1} name="apiSecret" placeholder="Paste Your Secret" type="text" />
              {state.errors?.apiSecret?.at(0) ? (
                <FormErrorMessage>{state.errors.apiSecret.at(0)}</FormErrorMessage>
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
