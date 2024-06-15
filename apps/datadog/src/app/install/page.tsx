'use client';

import {
  Form,
  FormErrorMessage,
  FormField,
  FormLabel,
  Input,
  InstructionsStep,
  InstructionsSteps,
  Select,
  SubmitButton,
} from '@elba-security/design-system';
import { useSearchParams } from 'next/navigation';
import { useFormState } from 'react-dom';
import { DATADOG_REGIONS_NAMES } from '@/connectors/datadog/regions';
import type { FormState } from './actions';
import { install } from './actions';

export default function InstallPage() {
  const searchParams = useSearchParams();
  const organisationId = searchParams.get('organisation_id');
  const region = searchParams.get('region');
  const [state, formAction] = useFormState<FormState, FormData>(install, {});

  return (
    <>
      <h1>Setup Datadog integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <div>
            <h3>How to obtain your DataDog Application Key and API Key?</h3>
            <p>
              1. In Datadog, Navigate to <b>Organization Settings</b>
            </p>
            <p>
              2. For the Application key, create an application key on the Application Keys Page in
              Datadog and input the key value in Elba. The minimum scope of the key must include:{' '}
              <b>user_access_read, user_access_manage</b>
            </p>
            <p>
              3. For the API key, create an API key from the API Keys Page in Datadog and input the
              key value in Elba:
            </p>
            <p>4. Choose your Datadog account region</p>
          </div>
        </InstructionsStep>

        <InstructionsStep index={2}>
          <h3>Connect Datadog</h3>
          <Form action={formAction}>
            <FormField isInvalid={Boolean(state.errors?.apiKey?.at(0))}>
              <FormLabel>API Key</FormLabel>
              <Input minLength={1} name="apiKey" placeholder="Paste Your Key" type="text" />
              {state.errors?.apiKey?.at(0) ? (
                <FormErrorMessage>{state.errors.apiKey.at(0)}</FormErrorMessage>
              ) : null}
            </FormField>
            <FormField isInvalid={Boolean(state.errors?.appKey?.at(0))}>
              <FormLabel>Application Key</FormLabel>
              <Input
                minLength={1}
                name="appKey"
                placeholder="Paste Your Application Key"
                type="text"
              />
              {state.errors?.appKey?.at(0) ? (
                <FormErrorMessage>{state.errors.appKey.at(0)}</FormErrorMessage>
              ) : null}
            </FormField>
            <FormField isInvalid={Boolean(state.errors?.sourceRegion?.at(0))}>
              <FormLabel>Region</FormLabel>

              <Select name="sourceRegion" placeholder="Select a region">
                {Object.entries(DATADOG_REGIONS_NAMES).map(([value, name]) => (
                  <option key={value} value={value}>
                    {`[${value}] - ${name}`}
                  </option>
                ))}
              </Select>

              {state.errors?.sourceRegion?.at(0) ? (
                <FormErrorMessage>{state.errors.sourceRegion.at(0)}</FormErrorMessage>
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
