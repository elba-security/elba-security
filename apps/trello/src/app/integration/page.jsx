'use client';

import { redirect, useParams } from 'next/navigation';
import { useEffect } from 'react';
import cookies from 'js-cookie';

function Integration() {
  const params = useParams();

  useEffect(() => {
    const token = window.location.hash.substring(1).split('=')[1];
    cookies.set('auth_token', token);
    redirect(
      // this is an example URL that should be replaced by an env variable
      `${process.env.NEXT_PUBLIC_DOMAIN}/auth`
    );
  }, [params]);

  return (
    <div>
      <p> Redirecting... </p>
    </div>
  );
}

export default Integration;
