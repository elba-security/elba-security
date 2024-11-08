import { EventEmitter } from '@elba-security/utils';
import Nango from '@nangohq/frontend';
import { createClient } from '../clients/frontend';

export const authenticate = () => {
  if (!process.env.NANGO_INTEGRATION_ID) {
    throw new Error('NANGO_INTEGRATION_ID is not set');
  }

  // const emitter = new EventEmitter();

  // const nango = createClient();
  // return nango.openConnectUI({
  //   // sessionToken: 'hello',
  //   onEvent,
  //   baseURL: 'https://connect.nango.dev',
  //   // baseURL: 'https://api.nango.dev',
  // });

  const nango = new Nango({ publicKey: process.env.NANGO_PUBLIC_KEY });
  // return nango;

  return nango.auth(process.env.NANGO_INTEGRATION_ID, 'antoine', {
    detectClosedAuthWindow: true,
  });
  // .then(async (result) => {
  //   await emitter.emit('success', { ...result });
  // })
  // .catch(async (error: unknown) => {
  //   await emitter.emit('error', error);
  // });

  // return emitter;
};
