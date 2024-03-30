// /app/install/page.ts
'use client';
import { useFormState } from 'react-dom';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { install, type FormState } from '@/actions/actions';

export default function ConnectionDetailsPage() {
  const searchParams = useSearchParams();
  const organisationId = searchParams.get('organization_id');
  const region = searchParams.get('region');

  const [state, formAction] = useFormState<FormState, FormData>(install, {});

  // redirect the user once the server responded with a redirectUrl
  useEffect(() => {
    if (state.redirectUrl) {
      window.location.assign(encodeURI(state.redirectUrl));
    }
  }, [state.redirectUrl]);

  return (
    <div>
    <form action={formAction}>
      <div role="group">
        <label htmlFor="domain">Domain</label>
        <input
          id="domain"
          minLength={1}
          name="domain"
          placeholder="https://mycompany.zendesk.com"
          type="text"
        />
        {state.errors?.domain?.at(0) ? <span>{state.errors.domain.at(0)}</span> : null}
      </div>

      <div role="group">
        <label htmlFor="clientId">Client id</label>
        <input minLength={1} name="clientId" placeholder="unique-client-id" type="text" />
        {state.errors?.clientId?.at(0) ? <span>{state.errors.clientId.at(0)}</span> : null}
      </div>

      <div role="group">
        <label htmlFor="clientSecret">Client secret</label>
        <input minLength={1} name="clientSecret" placeholder="1234abdefcghi56789" type="text" />
        {state.errors?.clientSecret?.at(0) ? <span>{state.errors.clientSecret.at(0)}</span> : null}
      </div>

      {organisationId !== null && (
        <input name="organisationId" type="hidden" value={organisationId} />
      )}
      {region !== null && <input name="region" type="hidden" value={region} />}

      <button type="submit">Install</button>
    </form>
    <span>_____________________________________________________</span>
    <div>
      <h2>Steps to Obtain Client Id and Secret.</h2>
      <ol>
      <li>Login to your Zendesk Account.</li>
      <li>Go to Admin Center.</li>
      <li>Enable API Access.</li>
      <li>Create OAuth client.</li>
      <li>Paste the following URL in the redirect url field: https://elba-redirection-url.com/redirect</li>
      <li>Add client id in the format: yourcompanyname-elba-integration </li>
      <li>Copy the client id, and client secret and paste it into the form.</li>
      </ol>
    </div>
    </div>
  );
}