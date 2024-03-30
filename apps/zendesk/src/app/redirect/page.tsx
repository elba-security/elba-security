'use client';
import { useEffect, useState } from 'react';
import {useSearchParams } from 'next/navigation';
import { logger } from '@elba-security/logger';

const getCookie = (name: string): string =>{
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return (parts[parts.length - 1] || '').split(';').shift() || 'null';
    }
    return 'null';
}

const fetchAuthToken = async (code: string, orgId: string, region: string) =>{
      const response = await fetch(`/api/token?code=${code}&orgId=${orgId}&region=${region}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseData = await response.json() as {access_token: string};
      return responseData;
    }

export default function RedirectPage() {
  const [accessGrantStatus, setAccessGrantStatus] = useState('WAITING');
  const [displayMessage, setDisplayMessage] = useState('');
  const searchParams = useSearchParams();
  useEffect(() => {
  const fetchData = async () => {
    const code = searchParams.get('code');
    const orgId = getCookie('organisation_id');
    const region = getCookie('region');
    const zenDeskError = searchParams.get('error') || null; 
    if (zenDeskError){
      setAccessGrantStatus('FAILED');
      setDisplayMessage('The end-user or authorization server denied the request.')
    }
    if (code && orgId && region) {
      try {
        await fetchAuthToken(code, orgId, region);
        setAccessGrantStatus('GRANTED');
        setDisplayMessage('Zendesk has been successfull integrated. You can safely close this tab now.')
      } catch (error) {
        logger.error('Error fetching auth token:', {error});
        window.location.assign(encodeURI(`/err`));
      }
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-floating-promises -- Need to find a way around it
  fetchData();
}, []);

    return (
    <div>
      <h2>{accessGrantStatus}...</h2>
      <span>{displayMessage}</span>
    </div>
  );
}


