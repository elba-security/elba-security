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
          text="Access Management"
        />
        <div className={styles.timeline} />
        <Step
          active={active === '2'}
          number="2"
          onClick={() => {
            setActive('2');
          }}
          text="Generate API Key"
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
            'In the Livestorm Dashboard, use the left navigation bar.',
            'Navigate to the Settings.',
            'Navigate to the Public API Section.',
            'Navigate to the Token Management Section.',
          ]}
        />
      )}
      {active === '2' && (
        <InstructionItems
          heading="Create API Token"
          instructions={[
            'Click on new Token.',
            'Give your API Token a name.',
            'Select the desired scopes (permissions) for the token.',
            'Click Generate a Token.',
          ]}
        />
      )}
      {active === '3' && (
        <>
          <InstructionItems
            heading="Link Application"
            instructions={[
              'Copy your API Token.',
              'API Token will only be shown once. Store it somewhere safe.',
              'Paste the API Token from your application below:',
            ]}
          />
          <form action={formAction} className={styles.formContainer}>
            <div role="group">
              <label htmlFor="token">Token</label>
              <input
                id="token"
                minLength={1}
                name="token"
                placeholder="Paste Your Token"
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
