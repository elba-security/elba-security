import { EventEmitter } from '@elba-security/utils';
import { createClient } from '../clients/frontend';

export const authenticate = (): EventEmitter => {
  if (!process.env.NANGO_INTEGRATION_ID) {
    throw new Error('NANGO_INTEGRATION_ID is not set');
  }

  const emitter = new EventEmitter();

  const nango = createClient();

  nango
    .auth(process.env.NANGO_INTEGRATION_ID, {
      detectClosedAuthWindow: true,
    })
    .then(async (result) => {
      await emitter.emit('success', { ...result });
    })
    .catch(async (error: unknown) => {
      await emitter.emit('error', error);
    });

  return emitter;
};
