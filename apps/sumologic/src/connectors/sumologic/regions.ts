export const SUMOLOGIC_REGIONS_NAMES = {
  au: 'Asia Pacific (Sydney)',
  ca: 'Canada (Central)',
  de: 'EU (Frankfurt)',
  eu: 'EU (Ireland)',
  fed: 'US East (N. Virginia)',
  in: 'Asia Pacific (Mumbai)',
  jp: 'Asia Pacific (Tokyo)',
  kr: 'Asia Pacific (Seoul)',
  us1: 'US East (N. Virginia)',
  us2: 'US West (Oregon)',
} as const;

export const getKeys = <T extends Record<string, string>>(obj: T) => {
  return Object.keys(obj) as [keyof T];
};
