# Instance install form

This recipe is for integrations that have an app installed in a SaaS instance which uses a combination of the domain, client ID and client secret in order to interact with its APIs.

> If your integration's authentication is working through a classic OAuth flow, you don't need to implement a form. For now, you can rely on the example provided in the template.

## Install page

When an admin is redirected from elba to an integration he land on the install page. The search params `organisation_id` and `region` must always be appended in the URL. The following example heavily relies on the new Next.js & React APIs: the page is a client component rendering a form that will call a server action on submit. Once the form is validated, the client will either redirect the user or display the errors bellow the form's fields.

> This recipe is CSS free. We don't expect the integrations to contain any stylesheet or components library. We will provide those UI elements in the near future.

```tsx
// /app/install/page.ts
'use client';
import { useFormState } from 'react-dom';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { install, type FormState } from './actions';

export default function InstallPage() {
  const searchParams = useSearchParams();
  const organisationId = searchParams.get('organisation_id');
  const region = searchParams.get('region');

  const [state, formAction] = useFormState<FormState, FormData>(install, {});

  // redirect the user once the server responded with a redirectUrl
  useEffect(() => {
    if (state.redirectUrl) {
      window.location.assign(state.redirectUrl);
    }
  }, [state.redirectUrl]);

  return (
    <form action={formAction}>
      <div role="group">
        <label htmlFor="domain">Domain</label>
        <input
          id="domain"
          minLength={1}
          name="domain"
          placeholder="https://mycompany.{SaaS}.com"
          type="text"
        />
        {state.errors?.domain?.at(0) ? <span>{state.errors.domain.at(0)}</span> : null}
      </div>

      <div role="group">
        <label htmlFor="clientId">Client id</label>
        <input minLength={1} name="clientId" placeholder="1234abds.xecr123" type="text" />
        {state.errors?.clientId?.at(0) ? <span>{state.errors.clientId.at(0)}</span> : null}
      </div>

      <div role="group">
        <label htmlFor="clientId">Client secret</label>
        <input minLength={1} name="clientSecret" placeholder="1234abdefcghi56789" type="text" />
        {state.errors?.clientSecret?.at(0) ? <span>{state.errors.clientSecret.at(0)}</span> : null}
      </div>

      {organisationId !== null && (
        <input name="organisationId" type="hidden" value={organisationId} />
      )}
      {region !== null && <input name="region" type="hidden" value={region} />}

      <button type="submit">Install</button>
    </form>
  );
}
```

## Server install action

The install server action is invoked when the install form is submitted. This function handles the validation of the input and response (noted `state` here) creation. The business part, such as granting a token and saving the organisation in database, should be handled in a dedicated service function named `registerOrganisation`.

This server action returns a redirectUrl in case the installation has been attempted or the provided `organisationId` & `region` by elba are invalid or missing.

If the form fields have invalid values, the function will return all the errors related to those fields so the client is able to display them.

```ts
// /app/install/actions.ts
'use server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { env } from '@/env';
import { registerOrganisation } from './service';

const formSchema = z.object({
  domain: z.string().url(),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  organisationId: z.string().uuid(),
  region: z.string().min(1),
});

export type FormState = {
  redirectUrl?: string;
  errors?: {
    domain?: string[] | undefined;
    clientId?: string[] | undefined;
    clientSecret?: string[] | undefined;
    // we are not handling region & organisationId errors in the client as fields are hidden
  };
};

export const install = async (_: FormState, formData: FormData): Promise<FormState> => {
  const result = formSchema.safeParse({
    domain: formData.get('domain'),
    clientId: formData.get('clientId'),
    clientSecret: formData.get('clientSecret'),
    organisationId: formData.get('clientId'),
    region: formData.get('region'),
  });

  if (!result.success) {
    const { fieldErrors } = result.error.flatten();
    //  elba should had given us a valid organisationId and region, so we let elba handle this error case
    if (fieldErrors.organisationId || fieldErrors.region) {
      return {
        redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=internal_error`,
      };
    }

    return {
      errors: fieldErrors,
    };
  }

  try {
    await registerOrganisation({
      organisationId,
      region,
      domain: result.data.domain,
      clientId: result.data.clientId,
      clientSecret: result.data.clientSecret,
    });

    return {
      redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&success=true`,
    };
  } catch (error) {
    logger.warn('Could not register organisation', { error });
    if (error instanceof MySaasError && error.response.status === 401) {
      return {
        redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=unauthorized`,
      };
    }
    return {
      redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=internal_error`,
    };
  }
};
```

## Service

The `registerOrganisation` service function is responsible for handling the business logic, such as interacting with the integrated SaaS or with the database.

To make sure the given configuration (`domain`, `clientId` and `clientSecret`) is valid, the service is going to retrieve a first access token. Note that it's common to have the field `organisation.token` set as not nullable, so retrieving an access token is mandatory to insert a new organisation in the database.

> If, for any reason, the integration is not storing the access token, the configuration should still be validated. Often, the SaaS API provides a way to make sure the configuration is valid.

## Reference documentation

- [Next.js server actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Next.js `useSearchParams`](https://nextjs.org/docs/app/api-reference/functions/use-search-params)
- [Zod](https://zod.dev/?id=objects)
