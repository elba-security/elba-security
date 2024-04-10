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
          {' '}
          {/* Changed key to index for uniqueness */}
          <span className={styles.instructionNumber}>{index + 1}</span>
          <span className={styles.instructionText}>
            {index === 0 && active === '1' ? (
              <span>
                In this{' '}
                <a href="https://cloud.elastic.co/login" rel="noopener noreferrer" target="_blank">
                  link
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
            text="Generate API Key"
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
            heading="Create API Key"
            instructions={[
              ', go to your avatar in the upper right corner and choose Organization.',
              'On the API keys tab of the Organization page, click Create API Key.',
              'From the Create API Key page, you can configure your new key by adding a name, set expiration, or assign roles.',
              'Click Create API key, copy the generated API key, and store it in a safe place.',
            ]}
          />
        )}
        {active === '2' && (
          <>
            <InstructionItems
              active="2"
              heading="Link Application"
              instructions={['Paste your API Key from your application below:']}
            />
            <form action={formAction} className={styles.formContainer}>
              <div className={styles.inputFields}>
                <div role="group">
                  <label htmlFor="token">API Key</label>
                  <input
                    id="apiKey"
                    minLength={1}
                    name="apiKey"
                    placeholder="Paste Your API Key"
                    type="text"
                  />
                  {state.errors?.apiKey?.at(0) ? <span>{state.errors.apiKey.at(0)}</span> : null}
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
