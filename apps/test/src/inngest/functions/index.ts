import { inngest } from '../client';

const testLogFunction = inngest.createFunction(
  {
    id: 'test-logger',
  },
  { event: 'test/logger' },
  async ({ step, logger }) => {
    logger.info('[TEST] inngest log 1');
    logger.warn('[TEST] inngest log 2');
    logger.error('[TEST] inngest log 3');
    // logger.warn('test1', obj);
    await step.run('test', () => {
      logger.info('[TEST] inngest step log');
      throw new Error('[TEST] inngest step throw', new Error('THROW'));
    });
  }
);

export const inngestFunctions = [testLogFunction];
