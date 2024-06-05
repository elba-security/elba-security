'use client';

import {
  Form,
  FormErrorMessage,
  FormField,
  FormLabel,
  Input,
  InstructionsStep,
  SubmitButton,
} from '@elba-security/design-system';
import { useFormState } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import type { FormState } from './actions';
import { install } from './actions';

export default function InstallPage() {
  const searchParams = useSearchParams();
  const organisationId = searchParams.get('organisation_id');
  const region = searchParams.get('region');

  const [state, formAction] = useFormState<FormState, FormData>(install, {});

  return (
    <>
      <h1>Setup Monday integration</h1>
      <InstructionsStep index={1}>
        <h3>Create Token</h3>
        <p>
          In the Monday Dashboard, use the menu and navigate to <strong>Administration</strong>
        </p>
        <p>
          Navigate to <strong>Connections &gt; API</strong>
        </p>
        <p>
          If you didn&apos;t create an API token yet, click on <strong>Generate</strong>
        </p>
        <p>Copy your personal API token</p>
      </InstructionsStep>
      <InstructionsStep index={2}>
        <h3>Connect Monday</h3>
        <Form action={formAction}>
          <FormField isInvalid={Boolean(state.errors?.token?.at(0))}>
            <FormLabel>Personal API Token</FormLabel>
            <Input
              minLength={1}
              name="token"
              placeholder="Paste Your Personal API Token"
              type="text"
            />
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
    </>
  );
}
