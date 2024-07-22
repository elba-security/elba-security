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
      <h1>Setup Jira integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <h3>How to generate token?</h3>
          <p>
            1. Log in to you account and navigate to{' '}
            <Link
              href="https://id.atlassian.com/manage-profile/security/api-tokens"
              style={{ color: 'blue' }}>
              API tokens
            </Link>{' '}
            page
          </p>
          <p>2. Click Create API token.</p>
          <p>
            3. Give your API Token a name. For example, <b>elba-security</b> and create. Make sure
            to copy the token
          </p>
        </InstructionsStep>
        <InstructionsStep index={2}>
          <h3>How to get your domain?</h3>
          <p>1. Log into your Jira account via your web browser.</p>
          <p>
            2. Look at the URL. It typically follows this format:{' '}
            <b>https://your-domain.atlassian.net</b>, copy the domain, for example{' '}
            <b>your-domain</b>
          </p>
        </InstructionsStep>
        <InstructionsStep index={3}>
          <h3>How to get your email?</h3>
          <p>Your jira account email</p>
        </InstructionsStep>
        <InstructionsStep index={4}>
          <h3>Connect Jira</h3>
          <Form action={formAction}>
            <FormField isInvalid={Boolean(state.errors?.apiToken?.at(0))}>
              <FormLabel>API Token</FormLabel>
              <Input minLength={1} name="apiToken" placeholder="Paste Your Token" type="text" />
              {state.errors?.apiToken?.at(0) ? (
                <FormErrorMessage>{state.errors.apiToken.at(0)}</FormErrorMessage>
              ) : null}
            </FormField>
            <FormField isInvalid={Boolean(state.errors?.apiToken?.at(0))}>
              <FormLabel>Your Domain</FormLabel>
              <Input minLength={1} name="domain" placeholder="Paste Your Domain" type="text" />
              {state.errors?.domain?.at(0) ? (
                <FormErrorMessage>{state.errors.domain.at(0)}</FormErrorMessage>
              ) : null}
            </FormField>
            <FormField isInvalid={Boolean(state.errors?.apiToken?.at(0))}>
              <FormLabel>Your Email</FormLabel>
              <Input minLength={1} name="email" placeholder="Paste Your Email" type="text" />
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
