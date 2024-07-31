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
import Link from 'next/link';
import type { FormState } from './actions';
import { install } from './actions';

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
          <h3>How to generate token?</h3>
          <p>
            1. Log in to you organization and navigate to{' '}
            <Link
              href="https://id.atlassian.com/manage-profile/security/api-tokens"
              style={{ color: 'blue' }}>
              API keys
            </Link>{' '}
            page
          </p>
          <p>2. Click Create API key.</p>
          <p>
            3. Give your API Key a name. For example, <b>elba-security</b> and create. Make sure to
            copy the token
          </p>
        </InstructionsStep>
        <InstructionsStep index={4}>
          <h3>Connect Elastic</h3>
          <Form action={formAction}>
            <FormField isInvalid={Boolean(state.errors?.apiKey?.at(0))}>
              <FormLabel>API Key</FormLabel>
              <Input minLength={1} name="apiKey" placeholder="Paste Your Token" type="text" />
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
