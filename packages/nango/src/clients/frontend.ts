import Nango from '@nangohq/frontend';

export const createClient = () => {
  const publicKey = process.env.NANGO_PUBLIC_KEY;

  // if (!publicKey) {
  //   throw new Error('NANGO_PUBLIC_KEY environment variable is not set');
  // }

  return new Nango({
    publicKey,
  });
};
