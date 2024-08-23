'use client';
import React, { useState, useEffect } from 'react';
import { Form, Select, FormField, FormLabel, SubmitButton } from '@elba-security/design-system';
import { useFormState } from 'react-dom';
import { redirectTo } from './actions';
import type { FormState } from './actions';

type Workspace = {
  uuid: string;
  name: string;
};

export default function InstallPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [state, formAction] = useFormState<FormState, FormData>(redirectTo, {});

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
      <h3>Elba does not support multi workspace, please select only one workspace</h3>

      <Form action={formAction}>
        <FormField isInvalid={Boolean(state.errors?.workspaceId?.at(0))}>
          <FormLabel>Workspace</FormLabel>

          <Select name="workspaceId" placeholder="Select a workspace">
            {workspaces.map((workspace) => (
              <option key={workspace.uuid} value={workspace.uuid}>
                {workspace.name}
              </option>
            ))}
          </Select>
        </FormField>
        <SubmitButton>Connect again</SubmitButton>
      </Form>
      {/* <Form action={() => redirectTo(selectedWorkspace)}>
        <Select
          name="workspaceId"
          placeholder="Select a workspace"
          value={selectedWorkspace}
          onChange={handleWorkspaceChange}>
          {workspaces.map((workspace) => (
            <option key={workspace.uuid} value={workspace.uuid}>
              {workspace.name}
            </option>
          ))}
        </Select>
        <SubmitButton disabled={!selectedWorkspace}>Connect again</SubmitButton>
      </Form> */}
    </>
  );
}
