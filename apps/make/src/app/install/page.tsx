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
  Select,
} from '@elba-security/design-system';
import { useSearchParams } from 'next/navigation';
import { useFormState } from 'react-dom';
import { useState } from 'react';
import type { FormState } from './actions';
import { install } from './actions';

export default function InstallPage() {
  const searchParams = useSearchParams();
  const organisationId = searchParams.get('organisation_id');
  const region = searchParams.get('region');

  const [state, formAction] = useFormState<FormState, FormData>(install, {});
  const [selectedZone, setSelectedZone] = useState('');

  const handleOrganizationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOrgId = e.target.value;
    const selectedOrg = state.organizations?.find((org) => String(org.id) === selectedOrgId);
    if (selectedOrg) {
      setSelectedZone(selectedOrg.zone);
    }
  };

  return (
    <>
      <h1>Setup Make integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <h3>Generate a API Token</h3>
          <p>
            1. Sign in to Make API and click your avatar at the bottom-left corner of the page and
            Click <b>Profile</b>
          </p>
          <p>
            2. Open the API tab and Click <b>Add token</b>
          </p>
          <p>3. Select the scopes you need for working with API resources.</p>
          <p>
            4. Click <b>Save</b> and Copy the token and input the key value in Elba:
          </p>
        </InstructionsStep>
        <InstructionsStep index={2}>
          <h3>Obtain your zone domain</h3>
          <p>
            1. Select <b>Organizations</b> from the sidebar of the page.
          </p>
          <p>
            2. Click on the <b>Variables</b> tab
          </p>
          <p>3. Copy the Value displayed against the Zone Domain and input the value in Elba:</p>
        </InstructionsStep>
        <InstructionsStep index={3}>
          <h3>Connect Make</h3>
          <Form action={formAction}>
            <FormField isInvalid={Boolean(state.errors?.apiToken?.at(0))}>
              <FormLabel>API Token</FormLabel>
              <Input minLength={1} name="apiToken" placeholder="Paste Your API Token" type="text" />
              {state.errors?.apiToken?.at(0) ? (
                <FormErrorMessage>{state.errors.apiToken.at(0)}</FormErrorMessage>
              ) : null}
            </FormField>

            {state.organizations ? (
              <>
                <FormField isInvalid={Boolean(state.errors?.zoneDomain?.at(0))}>
                  <FormLabel>Zone Domain</FormLabel>
                  <Input
                    minLength={1}
                    name="zoneDomain"
                    placeholder="Paste Your Zone Domain"
                    type="text"
                    value={selectedZone}
                    readOnly
                  />
                  {state.errors?.zoneDomain?.at(0) ? (
                    <FormErrorMessage>{state.errors.zoneDomain.at(0)}</FormErrorMessage>
                  ) : null}
                </FormField>
                <FormField isInvalid={Boolean(state.errors?.selectedOrganizationId?.at(0))}>
                  <FormLabel>Select Organization</FormLabel>
                  <Select
                    name="selectedOrganizationId"
                    placeholder="Select an organization"
                    onChange={handleOrganizationChange}>
                    {state.organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {`${org.name} - ${org.zone}`}
                      </option>
                    ))}
                  </Select>
                  {state.errors?.selectedOrganizationId?.at(0) ? (
                    <FormErrorMessage>{state.errors.selectedOrganizationId.at(0)}</FormErrorMessage>
                  ) : null}
                </FormField>
              </>
            ) : (
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
            )}
            {organisationId !== null && (
              <input name="organisationId" type="hidden" value={organisationId} />
            )}
            {region !== null && <input name="region" type="hidden" value={region} />}

            <SubmitButton>{state.organizations ? 'Install' : 'Fetch Organization'}</SubmitButton>
          </Form>
        </InstructionsStep>
      </InstructionsSteps>
    </>
  );
}
