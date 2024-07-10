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
import { useFormState } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import type { FormState } from './actions';
import { install } from './actions';

export default function InstallPage() {
  const searchParams = useSearchParams();
  const organisationId = searchParams.get('organisation_id');
  const region = searchParams.get('region');
  const [state, formAction] = useFormState<FormState, FormData>(install, {});

  return (
    <>
      <h1>Setup Tableau Integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <div>
            <h3>Step 1: Create a connected app</h3>
            <p>Create a connected app from Tableau Servers Settings page.</p>
            <p>1. As a server admin, sign in to Tableau Server.</p>
            <p>
              2. From the left pane, select <b>Settings &gt; Connected Apps</b>.
            </p>
            <p>
              3. Click the New Connected App button drop-down arrow and select <b>Direct Trust.</b>
            </p>
            <p>
              <b>Note:</b> If you&apos;re using Tableau Server 2023.3 or earlier, click{' '}
              <b>New Connected App</b> button.
            </p>
            <p>4. In the Create Connected App dialog box</p>
            <p>
              In the Connected app name text box, enter a name for the connected app and click the
              Create button.
            </p>
            <p>
              <b>Note:</b> You can ignore <b>Note:</b> and <b>Domain allowlist</b> when configuring
              a connected app for REST API and Metadata API authorization.
            </p>
            <p>
              5. Next to the connected app&apos;s name, click the actions menu and select Enable.
              For security purposes, a connected app is set to disabled by default when created.
            </p>
            <p>
              6. Make note of the connected app&apos;s ID, also known as the client ID, to use
              below.
            </p>
          </div>
        </InstructionsStep>
        <InstructionsStep index={2}>
          <div>
            <h3>Step 2: Generate a secret</h3>
            <p>
              1. On the detail page of the connected app you created in Step 1, click the{' '}
              <b>Generate New Secret</b> button.
            </p>
            <p>2. Make note of the secret ID and secret value to use below.</p>
            <p>
              3. Make note of the url of the home page of your tableau cloud instance to use below.
              (Example: https://10ax.online.tableau.com/#/site/elba/home)
            </p>
          </div>
        </InstructionsStep>
        <InstructionsStep index={3}>
          <h3>Connect Tableau</h3>
          <Form action={formAction}>
            <FormField isInvalid={Boolean(state.errors?.clientId?.at(0))}>
              <FormLabel>Client ID</FormLabel>
              <Input minLength={1} name="clientId" placeholder="Past your client ID" type="text" />
              {state.errors?.clientId ? (
                <FormErrorMessage>{state.errors.clientId.at(0)}</FormErrorMessage>
              ) : null}
            </FormField>
            <FormField isInvalid={Boolean(state.errors?.secretId?.at(0))}>
              <FormLabel>Secret ID</FormLabel>
              <Input minLength={1} name="secretId" placeholder="Past your secret ID" type="text" />
              {state.errors?.secretId ? (
                <FormErrorMessage>{state.errors.secretId.at(0)}</FormErrorMessage>
              ) : null}
            </FormField>
            <FormField isInvalid={Boolean(state.errors?.secret?.at(0))}>
              <FormLabel>Secret Value</FormLabel>
              <Input minLength={1} name="secret" placeholder="Past your secret value" type="text" />
              {state.errors?.secret ? (
                <FormErrorMessage>{state.errors.secret.at(0)}</FormErrorMessage>
              ) : null}
            </FormField>
            <FormField isInvalid={Boolean(state.errors?.email?.at(0))}>
              <FormLabel>Email</FormLabel>
              <Input
                minLength={1}
                name="email"
                placeholder="Please enter your admin email"
                type="email"
              />
              {state.errors?.email ? (
                <FormErrorMessage>{state.errors.email.at(0)}</FormErrorMessage>
              ) : null}
            </FormField>
            <FormField isInvalid={Boolean(state.errors?.url?.at(0))}>
              <FormLabel>URL</FormLabel>
              <Input minLength={1} name="url" placeholder="Paste your site URL" type="text" />
              {state.errors?.url ? (
                <FormErrorMessage>{state.errors.url.at(0)}</FormErrorMessage>
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
