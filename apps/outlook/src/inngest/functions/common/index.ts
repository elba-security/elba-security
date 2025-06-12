import type { GetOrganisationEvents } from './get-organisation';
import type { RemoveOrganisationEvents } from './remove-organisation';
import { removeOrganisation } from './remove-organisation';
import { getOrganisation } from './get-organisation';
import { getToken } from './get-token';
import type { OrganisationEvents } from './organisation';
import { type GetTokenEvents } from './get-token';

export type CommonEvents = GetOrganisationEvents &
  OrganisationEvents &
  RemoveOrganisationEvents &
  GetTokenEvents;

export const commonFunctions = [getOrganisation, removeOrganisation, getToken];
