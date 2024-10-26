'use client';
import React from 'react';
import { Form, SubmitButton } from '@elba-security/design-system';
import { redirectTo } from './actions';

export default function InstallPage() {
  return (
    <>
      <h1>Multi workspace support!</h1>
      <h3>Elba does not support multi workspace, please select only one workspace</h3>
      <Form action={redirectTo}>
        <SubmitButton>Connect again</SubmitButton>
      </Form>
    </>
  );
}
