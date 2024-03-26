'use client';

import React, { useState, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import styles from '../styles.module.css';
import { install } from './action';
import type { FormState } from './action';
import { sourceRegions } from './consts';

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
                In{' '}
                <a
                  href="https://www.sumologic.com/sign-up/"
                  rel="noopener noreferrer"
                  target="_blank">
                  Sumo Logic
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
              ', click your name in the left-nav and open the Preferences page.',
              'In the My Access Keys section, click + Add Access Key.',
              'The Create a Sumo Logic Access Key window appears.',
              'Enter a name for the access key in the Name field.',
              'Copy the Access ID and Access Key',
            ]}
          />
        )}
        {active === '2' && (
          <>
            <InstructionItems
              active="2"
              heading="Link Application"
              instructions={['Paste your Access ID and Access Key from your application below:']}
            />
            <form action={formAction} className={styles.formContainer}>
              <div className={styles.inputFields}>
                <div role="group">
                  <label htmlFor="token">Access ID</label>
                  <input
                    id="accessId"
                    minLength={1}
                    name="accessId"
                    placeholder="Paste Your Access ID"
                    type="text"
                  />
                  {state.errors?.accessId?.at(0) ? (
                    <span>{state.errors.accessId.at(0)}</span>
                  ) : null}
                </div>
                <div role="group">
                  <label htmlFor="accessKey">Access Key</label>
                  <input
                    id="accessKey"
                    minLength={1}
                    name="accessKey"
                    placeholder="Paste Your Access Key"
                    type="text"
                  />
                  {state.errors?.accessKey?.at(0) ? (
                    <span>{state.errors.accessKey.at(0)}</span>
                  ) : null}
                </div>
                <div role="group">
                  <label htmlFor="sourceRegion">Deployment Region</label>
                  <select id="sourceRegion" name="sourceRegion">
                    {sourceRegions.map((sourceRegion) => (
                      <option key={sourceRegion} value={sourceRegion}>
                        {sourceRegion.toUpperCase()}
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
