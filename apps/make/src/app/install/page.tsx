'use client';

import { useSearchParams } from 'next/navigation';
import { install } from './actions';
import type { FormState } from './actions';
import { useFormState } from 'react-dom';
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


export default function InstallPage() {
  const searchParams = useSearchParams();
  const organisationId = searchParams.get('organisation_id');
  const region = searchParams.get('region');
  const [state, formAction] = useFormState<FormState, FormData>(install, {});

  return (
    <>
      <h1>Setup Make integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <div>
            <h3>How to obtain your Make API Token?</h3>
            <p>
              1. Sign in to Make API and click your avatar at the bottom-left corner of the page and Click <b>Profile</b>
            </p>
            <p>
              2. Open the API tab and Click <b>Add token</b>
            </p>
            <p>
              3. Select the scopes you need for working with API resources.
            </p>
            <p>
              4. Click Save and Copy the token and input the key value in Elba:
            </p>
          </div>
        </InstructionsStep>

        <InstructionsStep index={2}>
          <div>
            <h3>How to obtain your zone domain?</h3>
            <p>
              1. Select <b>Organizations</b> from the sidebar of the page.
            </p>
            <p>
              2. Click on the <b>Variables</b> tab
            </p>
            <p>
              4. Copy the Value displayed against the Zone Domain and input the value in Elba:
            </p>
          </div>
        </InstructionsStep>

        <InstructionsStep index={3}>
          <h3>Connect Make</h3>
          <Form action={formAction}>
            <FormField isInvalid={Boolean(state.errors?.token?.at(0))}>
              <FormLabel>API Token</FormLabel>
              <Input minLength={1} name="token" placeholder="Paste Your Token" type="text" />
              {state.errors?.token?.at(0) ? (
                <FormErrorMessage>{state.errors.token.at(0)}</FormErrorMessage>
              ) : null}
            </FormField>
            <FormField isInvalid={Boolean(state.errors?.zoneDomain?.at(0))}>
              <FormLabel>Zone Domain</FormLabel>
              <Input
                minLength={1}
                name="zoneDomain"
                placeholder="Paste Your Zone Domain"
                type="text"
              />
              {state.errors?.zoneDomain?.at(0) ? (
                <FormErrorMessage>{state.errors.zoneDomain.at(0)}</FormErrorMessage>
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



