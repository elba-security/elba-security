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

function InstructionItems({
  heading,
  instructions,
  active,
}: {
  heading: string;
  instructions: string[];
  active: string;
}) {
  return (
    <div className={styles.instructions_container}>
      <h1>{heading}</h1>
      {instructions.map((item, index) => (
        <div className={styles.instruction} key={item}>
          <span className={styles.instructionNumber}>{index + 1}</span>
          <span className={styles.instructionText}>
            {index === 0 && active === '1' ? (
              <span>
                In this <a href="https://us1.dbt.com/" rel="noopener noreferrer" target="_blank"> link
                </a>
                {item}.
              </span>
            ) : (
              item
            )}
          </span>
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
            text="Generate Service Token"
          />
          <div className={styles.timeline} />
          <div className={styles.timeline} />
          <Step
            active={active === '2'}
            number="2"
            onClick={() => {
              setActive('2');
            }}
            text="Link Application"
          />
        </div>
        {active === '1' && (
          <InstructionItems
            active="1"
            heading="Create Service Token"
            instructions={[
              ', click the setting icon in the right-nav and open the Account setting page.',
              'In the Account section, copy Account Id and Access URLs',
              'In the API tokens/Service tokens section, click + Create service token.',
              'The Create Access token window appears.',
              'Enter a name for the service token in the Name field and Add an Account Admin permission.',
            ]}
          />
        )}
        {active === '2' && (
          <>
            <InstructionItems
              active="2"
              heading="Link Application"
              instructions={['Paste your Service Token from your application below:']}
            />
            <form action={formAction} className={styles.formContainer}>
              <div className={styles.inputFields}>
                <div role="group">
                  <label htmlFor="token">Service Token</label>
                  <input
                    id="serviceToken"
                    minLength={1}
                    name="serviceToken"
                    placeholder="Paste Your Service Token"
                    type="text"
                  />
                  {state.errors?.serviceToken?.at(0) ? (
                    <span>{state.errors.serviceToken.at(0)}</span>
                  ) : null}
                </div>

                <div role="group">
                  <label htmlFor="token">Account ID</label>
                  <input
                    id="accountId"
                    minLength={1}
                    name="accountId"
                    placeholder="Paste Your Account ID"
                    type="text"
                  />
                  {state.errors?.accountId?.at(0) ? (
                    <span>{state.errors.accountId.at(0)}</span>
                  ) : null}
                </div>
                <div role="group">
                  <label htmlFor="token">Access URL</label>
                  <input
                    id="accessUrl"
                    minLength={1}
                    name="accessUrl"
                    placeholder="https://example.us1.dbt.com"
                    type="text"
                  />
                  {state.errors?.accessUrl?.at(0) ? (
                    <span>{state.errors.accessUrl.at(0)}</span>
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
