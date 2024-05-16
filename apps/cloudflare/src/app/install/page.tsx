// /app/install/page.ts
'use client';
import { useFormState } from 'react-dom';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import './style.css';
import type { FormState } from './action';
import { install } from './action';

export default function InstallPage() {
  const searchParams = useSearchParams();
  const organisationId = searchParams.get('organisation_id');
  const region = searchParams.get('region');

  const [state, formAction] = useFormState<FormState, FormData>(install, {});

  useEffect(() => {
    if (state.redirectUrl) {
      window.location.assign(state.redirectUrl);
    }
  }, [state.redirectUrl]);

  return (
    <div className="layout-container">
      <div className="form-container">
        <form action={formAction} className="form">
          <div className="form-header">
            <h1>
              <span>save Auth key</span>
            </h1>
            <p>Connect Cloudflare to demonstrate that your system is monitored.</p>
          </div>
          <div className="form-describination">
            <div className="description-text">
              <div>
                <span>1</span>
              </div>
              <p>
                Create an{' '}
                <span>
                  <b> Auth Email </b>
                </span>
                and
                <span>
                  <b> Auth Key </b>
                </span>
                on Cloudflare.
              </p>
            </div>
            <div className="description-text">
              <div>
                <span>2</span>
              </div>
              <p>
                Provide the Auth email and Auth key provided earlier and paste them in the boxes
                below.
              </p>
            </div>
          </div>
          <div className="form-group-controller">
            <div className="form-controller" role="group">
              <label htmlFor="authEmail">Auth Email</label>
              <div>
                <input
                  defaultValue="nishi@airoxa.in"
                  minLength={1}
                  name="authEmail"
                  placeholder="1234abds.xecr123"
                  type="text"
                />
                {state.errors?.authEmail?.at(0) ? (
                  <span>{state.errors.authEmail.at(0)}</span>
                ) : null}
              </div>
            </div>

            <div className="form-controller" role="group">
              <label htmlFor="authKey">Auth Key</label>
              <div>
                <input
                  defaultValue="02bdb83f253289180e21711c8d04208e1b494"
                  minLength={1}
                  name="authKey"
                  placeholder="1234abdefcghi56789"
                  type="text"
                />
                {state.errors?.authKey?.at(0) ? <span>{state.errors.authKey.at(0)}</span> : null}
              </div>
            </div>

            {organisationId !== null && (
              <input name="organisationId" type="hidden" value={organisationId} />
            )}
            {region !== null && <input name="region" type="hidden" value={region} />}

            <button className="install-btn" type="submit">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
