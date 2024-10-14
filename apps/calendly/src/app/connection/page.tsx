'use client';
import React from 'react';
import { Form, SubmitButton } from '@elba-security/design-system';
import { redirectTo } from './actions';

export default function InstallPage() {
  return (
    <>
      <h1>Unsupported Plan!</h1>
      <b>
        Elba does not support the Free (Basic) or Essentials plans. Please connect with an account
        that is on a supported plan for teams: Standard, Professional(legacy plan), Teams, or
        Enterprise.
      </b>
      <Form action={redirectTo}>
        <SubmitButton>Connect again</SubmitButton>
      </Form>
    </>
  );
}
