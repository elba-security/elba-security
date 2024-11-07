export class GoogleUnauthorizedError extends Error {}

export class GoogleUserNotAdminError extends GoogleUnauthorizedError {}

export class GoogleDriveAccessDenied extends GoogleUnauthorizedError {}
