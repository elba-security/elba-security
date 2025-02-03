// https://docs.datadoghq.com/getting_started/site/#access-the-datadog-site

export const DATADOG_REGIONS = [
  'ap1.datadoghq.com',
  'datadoghq.eu',
  'datadoghq.com',
  'us3.datadoghq.com',
  'us5.datadoghq.com',
  'ddog-gov.com',
] as const;

type DatadogRegion = (typeof DATADOG_REGIONS)[number];

export const DATADOG_REGIONS_URLS: Record<DatadogRegion, string> = {
  'ap1.datadoghq.com': 'ap1.datadoghq.com',
  'datadoghq.eu': 'app.datadoghq.eu',
  'datadoghq.com': 'app.datadoghq.com',
  'us3.datadoghq.com': 'us3.datadoghq.com',
  'us5.datadoghq.com': 'us5.datadoghq.com',
  'ddog-gov.com': 'ddog-gov.com',
};

export const getDatadogRegionURL = (region: string) => {
  const regionDomain = DATADOG_REGIONS_URLS[region as DatadogRegion];
  if (!regionDomain) {
    throw new Error('Invalid Datadog URL');
  }

  return `https://${regionDomain}`;
};
