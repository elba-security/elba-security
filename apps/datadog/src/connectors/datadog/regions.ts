// https://docs.datadoghq.com/getting_started/site/#access-the-datadog-site

export const DATADOG_REGIONS = ['AP1', 'EU1', 'US1', 'US3', 'US5', 'US1-FED'] as const;

type DatadogRegion = (typeof DATADOG_REGIONS)[number];

export const DATADOG_REGIONS_DOMAINS: Record<DatadogRegion, string> = {
  AP1: 'ap1.datadoghq.com',
  EU1: 'datadoghq.eu',
  US1: 'datadoghq.com',
  US3: 'us3.datadoghq.com',
  US5: 'us5.datadoghq.com',
  'US1-FED': 'ddog-gov.com',
};
export const DATADOG_REGIONS_URLS: Record<DatadogRegion, string> = {
  AP1: 'ap1.datadoghq.com',
  EU1: 'app.datadoghq.eu',
  US1: 'app.datadoghq.com',
  US3: 'us3.datadoghq.com',
  US5: 'us5.datadoghq.com',
  'US1-FED': 'ddog-gov.com',
};
export const DATADOG_REGIONS_NAMES: Record<DatadogRegion, string> = {
  AP1: 'Japan',
  EU1: 'Europe - Germany',
  US1: 'United States - East',
  US3: 'United States - West',
  US5: 'United States - Central',
  'US1-FED': 'United Stated (FedRamp)',
};

export const getDatadogRegionAPIBaseURL = (region: string) => {
  const regionDomain = DATADOG_REGIONS_DOMAINS[region as DatadogRegion];
  if (!regionDomain) {
    throw new Error('Invalid Datadog region');
  }

  return `https://api.${regionDomain}`;
};

export const getDatadogRegionURL = (region: string) => {
  const regionDomain = DATADOG_REGIONS_URLS[region as DatadogRegion];
  if (!regionDomain) {
    throw new Error('Invalid Datadog URL');
  }

  return `https://${regionDomain}`;
};
