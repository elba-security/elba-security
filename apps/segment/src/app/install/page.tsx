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

  // const result = await getUsers(
  //   'sgp_XTmo17GebEc3RssqUFhs6SEmbombeL0mJ9L7S1vBu26mUBlco5ZZ2QXOibPqNrfc',
  //   0
  // );
  // logger.debug(result);

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
            text="Access Management"
          />
          <div className={styles.timeline} />
          <Step
            active={active === '2'}
            number="2"
            onClick={() => {
              setActive('2');
            }}
            text="Create Token"
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
            heading="Access Management"
            instructions={[
              'In the Segment Dashboard, use the menu (left) and navigate to the Settings.',
              'Click on Workspace Setting.',
              'Select the Access Management Tab.',
              'Click on Token button.',
            ]}
          />
        )}
        {active === '2' && (
          <InstructionItems
            heading="Create Token"
            instructions={[
              'While still on the Access Management Tab, click on the Create Token Button.',
              'In the next page, complete the Description input field.',
              'Click on the Workspace Owner to authorize owner permissions for your token.',
              'Click on the Create Button (bottom-right) to apply the choosen Segment Management API permissions to your token.',
              'Click on the Copy button to keep your token and use it in the next step.',
            ]}
          />
        )}
        {active === '3' && (
          <>
            <InstructionItems
              heading="Link Application"
              instructions={[
                'While still on the Created Token modal, click on the Copy button.',
                'Paste the token value from your application below:',
              ]}
            />
            <form action={formAction} className={styles.formContainer}>
              <div role="group">
                <label htmlFor="token">Token</label>
                <input
                  id="token"
                  minLength={1}
                  name="token"
                  placeholder="YourTokenHere"
                  type="text"
                />
                {state.errors?.token?.at(0) ? <span>{state.errors.token.at(0)}</span> : null}
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
