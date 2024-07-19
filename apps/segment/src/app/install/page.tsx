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
      <h1>Setup Segment integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <h3>Create Token</h3>
          <p>In the Segment Dashboard, use the menu (left) and navigate to the Settings</p>
          <p>
            you can see Workspace Setting, click on it, and then click on the{' '}
            <strong>Create Token Button</strong>
          </p>
          <p>
            After completing the Description input field, Copy the Token and paste them in the
            fields below. You will not be able to see the Token again. Make sure to save them in a
            secure place.
          </p>
        </InstructionsStep>
        <InstructionsStep index={2}>
          <h3>Connect Segment</h3>
          <Form action={formAction}>
            <FormField isInvalid={Boolean(state.errors?.token?.at(0))}>
              <FormLabel>Token</FormLabel>
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
