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
           text="Generate API Token"
         />
         <div className={styles.timeline} />
         <Step
           active={active === '2'}
           number="2"
           onClick={() => {
             setActive('2');
           }}
           text="Generate Team ID"
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
           heading="Create API Token"
           instructions={[
            'In the upper-right corner of your dashboard, click your profile picture, then select Settings.',
            'Select Tokens from the sidebar.',
            'Enter a descriptive name for the token.',
            'Choose the scope from the list of Teams in the drop-down menu. The scope ensures that only your specified Team(s) can use an Access Token.',
            'From the drop-down, select an expiration date for the Token.',
            'Click Create Token.',
            'Copy your API Token.',
           ]}
         />
       )}
       {active === '2' && (
         <InstructionItems
           heading="Generate Team ID"
           instructions={[
            'In the upper-right corner of your dashboard, click your profile picture, then select Settings.',
            'Select Teams from the sidebar.',
            'Click on the Manage button of the desired team.',
            'Copy the Team ID displayed in the Team ID section.',
           ]}
         />
       )}
       {active === '3' && (
         <>
           <InstructionItems
             heading="Link Application"
             instructions={['Paste the API Token and Team ID from your application below:']}
           />
           <form action={formAction} className={styles.formContainer}>
             <div className={styles.inputFields}>
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
               <div role="group">
                 <label htmlFor="teamId">Team Id</label>
                 <input
                   id="teamId"
                   minLength={1}
                   name="teamId"
                   placeholder="Paste Your Team ID"
                   type="text"
                 />
                 {state.errors?.token?.at(0) ? <span>{state.errors.token.at(0)}</span> : null}
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
