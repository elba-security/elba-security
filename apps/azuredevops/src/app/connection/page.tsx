'use client';
import React, { useState, useEffect } from 'react';
import { Form, SubmitButton } from '@elba-security/design-system';
import { redirectTo } from './actions';

type Workspace = {
  name: string;
};

export default function InstallPage() {
  const [workspace, setWorkspace] = useState<Workspace>();

  useEffect(() => {
    // This code will only run on the client side
    const searchParams = new URLSearchParams(window.location.search);
    const workspacesParam = searchParams.get('workspaces');
    if (workspacesParam) {
      const parsedWorkspaces = JSON.parse(decodeURIComponent(workspacesParam)) as Workspace;
      setWorkspace(parsedWorkspaces);
    }
  }, []);

  return (
    <>
      <h1>Security Permission Required</h1>
      <b>
        Your organization settings currently restrict access for third-party applications. To
        proceed, please ensure that the organization’s{' '}
        <strong>Third-party application access via OAuth</strong>
        policy is enabled. This setting allows third-party applications to connect using OAuth. You
        can enable this in the organization’s settings under{' '}
        <strong>Application connection policies</strong>. You can change it here{' '}
        {workspace ? (
          <a
            href={`https://dev.azure.com/${workspace.name}/_settings/organizationPolicy`}
            target="_blank"
            rel="noopener noreferrer">
            Application connection policies
          </a>
        ) : (
          'Workspace not available'
        )}
        .
      </b>
      <Form action={redirectTo}>
        <SubmitButton>Reconnect with correct permissions</SubmitButton>
      </Form>
    </>
  );
}
