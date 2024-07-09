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
      <h1>Setup zendesk integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <h3>How to get Zendesk SubDomain</h3>
          <p>
            1. You can find the subdomain of your account on the <strong>Support Admin</strong> home
            page.
          </p>
          <p>
            2. Your subdomain is in your account URL. For example, if your account URL is{' '}
            <strong>https://yourdomain.zendesk.com</strong>
          </p>
        </InstructionsStep>
        <InstructionsStep index={2}>
          <h3>Connect zendesk</h3>
          <Form action={formAction}>
            <FormField isInvalid={Boolean(state.errors?.subDomain?.at(0))}>
              <FormLabel>Your Subdomain</FormLabel>
              <Input
                minLength={1}
                name="subDomain"
                placeholder="https://yourdomain.zendesk.com"
                type="text"
              />
              {state.errors?.subDomain?.at(0) ? (
                <FormErrorMessage>{state.errors.subDomain.at(0)}</FormErrorMessage>
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
