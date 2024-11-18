'use client';
import React, { useState, useEffect } from 'react';
import {
  Form,
  Select,
  FormField,
  FormLabel,
  SubmitButton,
  FormErrorMessage,
} from '@elba-security/design-system';
import { useFormState } from 'react-dom';
import { install } from './actions';
import type { FormState } from './actions';

type Workspace = {
  AccountName: string;
};

export default function InstallPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [state, formAction] = useFormState<FormState, FormData>(install, {});

  useEffect(() => {
    // This code will only run on the client side
    const searchParams = new URLSearchParams(window.location.search);
    const workspacesParam = searchParams.get('workspaces');
    if (workspacesParam) {
      const parsedWorkspaces = JSON.parse(decodeURIComponent(workspacesParam)) as Workspace[];
      setWorkspaces(parsedWorkspaces);
    }
  }, []);

  return (
    <>
      <h1>Multi workspace support!</h1>
      <p>Elba does not support multi workspace, please select only one workspace</p>

      <Form action={formAction}>
        <FormField isInvalid={Boolean(state.errors?.workspaceId?.at(0))}>
          <FormLabel>Workspace</FormLabel>

          <Select name="workspaceId" placeholder="Select a workspace">
            {workspaces.map((workspace) => (
              <option key={workspace.AccountName} value={workspace.AccountName}>
                {workspace.AccountName}
              </option>
            ))}
          </Select>
          <FormErrorMessage>
            {state.errors?.workspaceId?.at(0) ? (
              <FormErrorMessage>{state.errors.workspaceId.at(0)}</FormErrorMessage>
            ) : null}
          </FormErrorMessage>
        </FormField>
        <SubmitButton>Install</SubmitButton>
      </Form>
    </>
  );
}
