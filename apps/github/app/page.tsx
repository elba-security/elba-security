'use client';
import { useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';
import React, { useEffect } from 'react';
import { env } from '../env';

export default function IndexPage() {
  const searchParams = useSearchParams();
  const organisationId = searchParams.get('organisationId');

  useEffect(() => {
    if (organisationId) {
      Cookies.set('organisationId', organisationId);
    }
  }, [organisationId]);

  if (!organisationId) {
    // TODO: error page with link to redirect to elba
    return <span>some error</span>;
  }

  return <a href={env.NEXT_PUBLIC_ELBA_GITHUB_INSTALL_URL}>connect elba to Github</a>;
}
