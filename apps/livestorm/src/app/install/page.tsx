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
      <h1>Setup Livestorm integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <h3>Generate an API Token</h3>
          <p>
            1. On the Livestorm dashboard go to{' '}
            <b>
              <Link
                href="https://app.livestorm.co/#/settings?page=settings&tab=public-api&sub-tab=tokens"
                rel="noreferrer"
                target="_blank">
                Account {'>'} Account Settings {'>'} Public API {'>'} Token Management
              </Link>
            </b>
          </p>
          <p>
            2. Click on <strong>Create a token now</strong>.
          </p>
          <p>3. Give your API Token a name.</p>
          <p>
            4. Select <strong>Write</strong> permission on <strong>Admin</strong> section.
          </p>
          <p>
            5. Click on <strong>Generate a token</strong> (The token may be blocked in default, you
            should ask Livestorm to unblock it)
          </p>
        </InstructionsStep>
        <InstructionsStep index={2}>
          <h3>Connect Livestorm</h3>
          <Form action={formAction}>
            <FormField isInvalid={Boolean(state.errors?.token?.at(0))}>
              <FormLabel>API Key</FormLabel>
              <Input minLength={1} name="token" placeholder="Paste Your Token" type="text" />
              {state.errors?.token?.at(0) ? (
                <FormErrorMessage>{state.errors.token.at(0)}</FormErrorMessage>
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
