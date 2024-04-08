'use client';

import React, { useState, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import styles from '../styles.module.css';
import { install } from './action';
import type { FormState } from './action';
import { dbtRegions } from './consts';

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
                <a
                  href="https://cloud.getdbt.com/#/profile/api/"
                  rel="noopener noreferrer"
                  target="_blank">
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
              ', click the setting icon in the left-nav and open the Account setting page.',
              'In the API tokens/Personal tokens section, click + Create personal access token.',
              'The Create Access token window appears.',
              'Enter a name for the access token in the Name field.',
            ]}
          />
        )}
        {active === '2' && (
          <>
            <InstructionItems
              active="2"
              heading="Link Application"
              instructions={['Paste your Personal Token from your application below:']}
            />
            <form action={formAction} className={styles.formContainer}>
              <div className={styles.inputFields}>
                <div role="group">
                  <label htmlFor="token">Personal Token</label>
                  <input
                    id="personalToken"
                    minLength={1}
                    name="personalToken"
                    placeholder="Paste Your Personal Token"
                    type="text"
                  />
                  {state.errors?.personalToken?.at(0) ? (
                    <span>{state.errors.personalToken.at(0)}</span>
                  ) : null}
                </div>
                
                <div role="group">
                  <label htmlFor="dbtRegion">Deployment Region</label>
                  <select id="dbtRegion" name="dbtRegion">
                    {dbtRegions.map((dbtRegion) => (
                      <option key={dbtRegion} value={dbtRegion}>
                        {dbtRegion.toUpperCase()}
                      </option>
                    ))}
                  </select>
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
