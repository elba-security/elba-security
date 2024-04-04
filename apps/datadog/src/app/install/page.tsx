// /app/install/page.ts
'use client';
import { useFormState } from 'react-dom';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { type FormState, install } from './action';
import './style.css';

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
              <span>save API key</span>
            </h1>
            <p>Connect Datadog to demonstrate that your system is monitored.</p>
          </div>
          <div className="form-describination">
            <div className="description-text">
              <div>
                <span>1</span>
              </div>
              <p>
                Create an{' '}
                <span>
                  <b> Application Key </b>
                </span>
                and
                <span>
                  <b> API Key </b>
                </span>
                on Datadog. For instructions on making these, follow the&nbsp;
                <a
                  className="api-app-key-doc"
                  href="https://docs.datadoghq.com/account_management/api-app-keys/"
                  rel="noopener"
                  target="_blank">
                  <span>help article</span>
                </a>
                .
              </p>
            </div>
            <div className="description-text">
              <div>
                <span>2</span>
              </div>
              <p>
                Provide the Application key and API key name provided earlier and paste them in the
                boxes below.
              </p>
            </div>
          </div>
          <div className="form-group-controller">
            <div className="form-controller" role="group">
              <label htmlFor="apiKey">API Key</label>
              <div>
                <input
                  defaultValue="e369e2b93f17e9860f88587aaf6b2c64"
                  minLength={1}
                  name="apiKey"
                  placeholder="1234abds.xecr123"
                  type="text"
                />
                {state.errors?.apiKey?.at(0) ? <span>{state.errors.apiKey.at(0)}</span> : null}
              </div>
            </div>

            <div className="form-controller" role="group">
              <label htmlFor="appKey">Application Key</label>
              <div>
                <input
                  defaultValue="4dc7273e8deb72ad9785ac903866ab210fcf69a8"
                  minLength={1}
                  name="appKey"
                  placeholder="1234abdefcghi56789"
                  type="text"
                />
                {state.errors?.appKey?.at(0) ? <span>{state.errors.appKey.at(0)}</span> : null}
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
