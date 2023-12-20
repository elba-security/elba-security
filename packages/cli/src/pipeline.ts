import { ProcessPromise } from 'zx';
import dotenv from 'dotenv';
import path from 'path';

export const pipeline =
  (
    options: {
      env: 'test' | 'dev';
      inline?: boolean;
      onExit?: () => Promise<unknown>;
    },
    callback: (
      args: Record<string, any>
      // {}: { exit: () => void }
    ) => Promise<ProcessPromise[] | void>
  ) =>
  async (...args: any[]) => {
    dotenv.config({
      path: path.resolve(options.env === 'dev' ? '.env.local' : '.env.test'),
    });
    const processPromises: ProcessPromise[] = [];
    const makeExit = () => {
      let isExiting = false;

      return async () => {
        if (isExiting) {
          return;
        }
        isExiting = true;
        await Promise.all(processPromises.map((p) => p.kill()));
        if (options.onExit) {
          await options.onExit();
        }
        process.exitCode = 0;
      };
    };
    const result = await callback(args[0]);
    processPromises.push(...(result || []));

    const exit = makeExit();
    if (!options.inline) {
      exit();
    } else {
      process.on('SIGINT', exit);
      process.on('SIGTERM', exit);
    }
  };
