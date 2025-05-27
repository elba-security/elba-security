import { type UsersDeleteEvent } from './delete';
import { type UsersSyncEvent } from './sync';

export type UsersEvents = UsersSyncEvent | UsersDeleteEvent;

export * from './delete';
export * from './sync';
