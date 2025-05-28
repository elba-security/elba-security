import type { UpdateConnectionsObjects } from '@elba-security/schemas';

export type EmailScanningApp = UpdateConnectionsObjects['apps'][number];

export type EmailScanningAppUser = EmailScanningApp['users'][number];
