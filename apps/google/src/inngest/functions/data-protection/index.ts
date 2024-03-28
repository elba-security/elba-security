import { scheduleDataProtectionSync } from './schedule-sync';
import type { DeleteDataProtectionObjectPermissionsEvents } from './delete-object-permissions';
import { deleteDataProtectionObjectPermissions } from './delete-object-permissions';
import type { RefreshDataProtectionObjectEvents } from './refresh-object';
import { refreshDataProtectionObject } from './refresh-object';
import type { SyncDataProtectionDriveEvents } from './sync-drive';
import { syncDataProtectionDrive } from './sync-drive';
import type { SyncDataProtectionEvents } from './sync';
import { syncDataProtection } from './sync';
import type { SyncDataProtectionPersonalDrivesEvents } from './sync-personal-drives';
import { syncDataProtectionPersonalDrives } from './sync-personal-drives';
import type { SyncDataProtectionSharedDrivesEvents } from './sync-shared-drives';
import { syncDataProtectionSharedDrives } from './sync-shared-drives';

export type DataProtectionEvents = DeleteDataProtectionObjectPermissionsEvents &
  RefreshDataProtectionObjectEvents &
  SyncDataProtectionDriveEvents &
  SyncDataProtectionEvents &
  SyncDataProtectionPersonalDrivesEvents &
  SyncDataProtectionSharedDrivesEvents;

export const dataProtectionFunctions = [
  deleteDataProtectionObjectPermissions,
  refreshDataProtectionObject,
  scheduleDataProtectionSync,
  syncDataProtection,
  syncDataProtectionDrive,
  syncDataProtectionPersonalDrives,
  syncDataProtectionSharedDrives,
];
