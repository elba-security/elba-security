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
import { SUMOLOGIC_REGIONS_NAMES } from '@/connectors/sumologic/regions';
import type { FormState } from './actions';
import { install } from './actions';

export default function InstallPage() {
  const searchParams = useSearchParams();
  const organisationId = searchParams.get('organisation_id');
  const region = searchParams.get('region');
  const [state, formAction] = useFormState<FormState, FormData>(install, {});

  return (
    <>
      <h1>Setup Sumologic integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <div>
            <h3>How to obtain your Sumologic Access ID and Access Key?</h3>
            <p>
              1. In the top menu, select your username and then{' '}
              <b>
                <a
                  href="https://help.sumologic.com/docs/manage/security/access-keys/"
                  target="_blank"
                  rel="noopener noreferrer">
                  Preferences
                </a>
              </b>
            </p>
            <p>
              2. In the <b>My Access Keys</b> section, click <b>+ Add Access Key</b>.
            </p>
            <p>
              3. Enter a name for the access key in the <b>Access Key Name</b> field.
            </p>
            <p>
              4. Copy the <b>Access ID</b> and <b>Access Key</b>
            </p>
          </div>
        </InstructionsStep>

        <InstructionsStep index={2}>
          <h3>Connect Sumologic</h3>
          <Form action={formAction}>
            <FormField isInvalid={Boolean(state.errors?.accessId?.at(0))}>
              <FormLabel>Access ID</FormLabel>
              <Input minLength={1} name="accessId" placeholder="Paste Your Key" type="text" />
              {state.errors?.accessId?.at(0) ? (
                <FormErrorMessage>{state.errors.accessId.at(0)}</FormErrorMessage>
              ) : null}
            </FormField>
            <FormField isInvalid={Boolean(state.errors?.accessKey?.at(0))}>
              <FormLabel>Access Key</FormLabel>
              <Input
                minLength={1}
                name="accessKey"
                placeholder="Paste Your Access Key"
                type="text"
              />
              {state.errors?.accessKey?.at(0) ? (
                <FormErrorMessage>{state.errors.accessKey.at(0)}</FormErrorMessage>
              ) : null}
            </FormField>
            <FormField isInvalid={Boolean(state.errors?.sourceRegion?.at(0))}>
              <FormLabel>Region</FormLabel>

              <Select name="sourceRegion" placeholder="Select a region">
                {Object.entries(SUMOLOGIC_REGIONS_NAMES).map(([value, code]) => (
                  <option key={value} value={value}>
                    {`${value} - ${code}`}
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
