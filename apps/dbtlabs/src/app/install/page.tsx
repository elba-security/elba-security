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
      <h1>Setup Dbtlabs integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <h3>Create Service Token</h3>
          <p>1. Click the setting icon in the right-nav and open the Account setting page.</p>
          <p>2. In the Account section, copy Account Id and Access URLs</p>
          <p>3. In the API tokens/Service tokens section, click + Create service token.</p>
          <p>4. The Create Access token window appears.</p>
          <p>
            5. Enter a name for the service token in the Name field and Add an Account Admin
            permission.
          </p>
        </InstructionsStep>
        <InstructionsStep index={2}>
          <h3>Connect Doppler</h3>
          <Form action={formAction}>
            <FormField isInvalid={Boolean(state.errors?.accessUrl?.at(0))}>
              <FormLabel>Access Url</FormLabel>
              <Input
                minLength={1}
                name="accessUrl"
                placeholder="Paste Your Access Url, Ex: https://example.us1.dbt.com"
                type="text"
              />
              {state.errors?.accessUrl?.at(0) ? (
                <FormErrorMessage>{state.errors.accessUrl.at(0)}</FormErrorMessage>
              ) : null}
            </FormField>
            <FormField isInvalid={Boolean(state.errors?.accountId?.at(0))}>
              <FormLabel>Account Id</FormLabel>
              <Input
                minLength={1}
                name="accountId"
                placeholder="Paste Your Account ID"
                type="text"
              />
              {state.errors?.accountId?.at(0) ? (
                <FormErrorMessage>{state.errors.accountId.at(0)}</FormErrorMessage>
              ) : null}
            </FormField>
            <FormField isInvalid={Boolean(state.errors?.serviceToken?.at(0))}>
              <FormLabel>Service Token</FormLabel>
              <Input
                minLength={1}
                name="serviceToken"
                placeholder="Paste Your Service Token"
                type="text"
              />
              {state.errors?.serviceToken?.at(0) ? (
                <FormErrorMessage>{state.errors.serviceToken.at(0)}</FormErrorMessage>
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
