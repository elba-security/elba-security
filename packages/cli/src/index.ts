#!/usr/bin/env node
import { Command } from 'commander';
import { $ } from 'zx';
import {
  applyMigration,
  mountDatabase,
  mountTestDatabase,
  unmountDatabase,
  unmountTestDatabase,
} from './database.js';
import { pipeline } from './pipeline';

process.env.FORCE_COLOR = '1';

const program = new Command();

program
  .command('test')
  .option('-w, --watch', 'vitest watch')
  .option('--debug', 'display additional logs')
  .action(
    pipeline(
      {
        env: 'test',
        inline: true,
        onExit: unmountTestDatabase,
      },
      async (options) => {
        await mountTestDatabase();
        await applyMigration();
        await $`vitest ${options.watch ? '' : 'run'}`;
      }
    )
  );

program
  .command('dev')
  .option('--no-db', 'do not run database')
  .option('--preserve-db', 'keep database running after closing')
  .option('--debug', 'display additional logs')
  .action(
    pipeline(
      {
        env: 'dev',
        onExit: unmountDatabase,
      },
      async (options) => {
        if (!options.noDb) {
          await mountDatabase();
          await applyMigration();
        }

        console.log('Inngest dev server online at: http://localhost:8288');
        return [
          $`inngest-cli dev -u http://localhost:4000/api/inngest -p 8288`.quiet(),
          $`next dev`,
        ];
      }
    )
  );

program.command('migrate').action(
  pipeline(
    {
      env: 'dev',
      inline: true,
    },
    async () => {
      await applyMigration();
      console.log('migration applied');
    }
  )
);

program
  .command('database')
  .option('--up', 'mount the database')
  .option('--down', 'unmount the database')
  .option('--debug', 'display additional logs')
  .action(
    pipeline(
      {
        env: 'dev',
        inline: true,
      },
      async (options) => {
        if (options.up) {
          await mountDatabase();
        } else if (options.down) {
          await unmountDatabase();
        }
      }
    )
  );

program.parse();
