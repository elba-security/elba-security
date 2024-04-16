'use client';

import React, { useState, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import styles from '../styles.module.css';
import { install } from './action';
import type { FormState } from './action';

function Step({
  number,
  text,
  onClick,
  active,
}: {
  number: string;
  text: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div className={styles.step}>
      <button onClick={onClick} style={{ border: '0', background: 'transparent' }} type="button">
        <span
          className={styles.step_number}
          style={{
            backgroundColor: active ? '#22bb33' : 'gainsboro',
            color: active ? 'white' : 'black',
            fontWeight: active ? 'bold' : 'normal',
          }}>
          {number}
        </span>
      </button>
      <span className={styles.step_text} style={{ fontWeight: active ? 'bold' : 'normal' }}>
        {text}
      </span>
    </div>
  );
}

function InstructionItems({ heading, instructions }: { heading: string; instructions: string[] }) {
  return (
    <div className={styles.instructions_container}>
      <h1>{heading}</h1>
      {instructions.map((item, index) => (
        <div className={styles.instruction} key={item}>
          <span className={styles.instruction_number}>{index + 1}</span>
          <span className={styles.instruction_text}>{item}</span>
        </div>
      ))}
    </div>
  );
}

function InstructionsModal() {
  const [active, setActive] = useState<string>('1');
  const searchParams = useSearchParams();
  const organisationId = searchParams.get('organisation_id');
  const region = searchParams.get('region');

  const [state, formAction] = useFormState<FormState, FormData>(install, {});

  useEffect(() => {
    if (state.redirectUrl) {
      window.location.assign(state.redirectUrl);
    }
  }, [state, state.redirectUrl]);

  return (
    <div className={styles.container}>
      <div className={styles.modal}>
        <div className={styles.timeline_container}>
          <Step
            active={active === '1'}
            number="1"
            onClick={() => {
              setActive('1');
            }}
            text="Register Application"
          />
          <div className={styles.timeline} />
          <Step
            active={active === '2'}
            number="2"
            onClick={() => {
              setActive('2');
            }}
            text="Get Required Fields"
          />
          <div className={styles.timeline} />
          <Step
            active={active === '3'}
            number="3"
            onClick={() => {
              setActive('3');
            }}
            text="Link Application"
          />
        </div>
        {active === '1' && (
          <InstructionItems
            heading="Settings"
            instructions={[
              'In the Auth0 Dashboard, navigate to the Applications.',
              'Click Create Application button.',
              'Register a Machine-to-Machine Application. Follow the steps.',
            ]}
          />
        )}
        {active === '2' && (
          <InstructionItems
            heading="Create API Key"
            instructions={[
              'Select newly registered application and click Settings tab.',
              'Copy these fields: Domain, Client ID and Client Secret.',
              'Now navigate to the APIs option under the Applications on the left navigation bar.',
              'Select Auth0 Management API and copy the identifier as the Audience.',
            ]}
          />
        )}
        {active === '3' && (
          <>
            <InstructionItems
              heading="Link Application"
              instructions={['Paste the copied fields from your application below:']}
            />
            <form action={formAction} className={styles.formContainer}>
              <div className={styles.inputFields}>
                <div role="group">
                  <label htmlFor="clientId">Client ID</label>
                  <input
                    id="clientId"
                    minLength={1}
                    name="clientId"
                    placeholder="Paste Your client Id"
                    type="text"
                  />
                  {state.errors?.clientId?.at(0) ? (
                    <span>{state.errors.clientId.at(0)}</span>
                  ) : null}
                </div>
                <div role="group">
                  <label htmlFor="clientSecret">Client Secret</label>
                  <input
                    id="clientSecret"
                    minLength={1}
                    name="clientSecret"
                    placeholder="Paste Your Client Secret"
                    type="text"
                  />
                  {state.errors?.clientSecret?.at(0) ? (
                    <span>{state.errors.clientSecret.at(0)}</span>
                  ) : null}
                </div>
                <div role="group">
                  <label htmlFor="domain">Domain</label>
                  <input
                    id="domain"
                    minLength={1}
                    name="domain"
                    placeholder="Paste Your Domain"
                    type="text"
                  />
                  {state.errors?.domain?.at(0) ? <span>{state.errors.domain.at(0)}</span> : null}
                </div>
                <div role="group">
                  <label htmlFor="audience">Audience</label>
                  <input
                    id="audience"
                    minLength={1}
                    name="audience"
                    placeholder="Paste the audience"
                    type="text"
                  />
                  {state.errors?.audience?.at(0) ? (
                    <span>{state.errors.audience.at(0)}</span>
                  ) : null}
                </div>
              </div>

              {organisationId !== null && (
                <input name="organisationId" type="hidden" value={organisationId} />
              )}
              {region !== null && <input name="region" type="hidden" value={region} />}

              <button type="submit">Install</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const page = () => {
  return <InstructionsModal />;
};

export default page;
