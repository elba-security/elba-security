export const getCredentials = async (
  connectionId: string
): Promise<{ success: boolean; credentials?: { access_token: string }; error?: string }> => {
  if (
    !process.env.NANGO_HOST ||
    !process.env.NANGO_INTEGRATION_ID ||
    !process.env.NANGO_SECRET_KEY
  ) {
    throw new Error('Nango credentials are not set');
  }

  const result = await fetch(
    `https://${process.env.NANGO_HOST}/connection/${connectionId}?provider_config_key=${process.env.NANGO_INTEGRATION_ID}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.NANGO_SECRET_KEY}`,
      },
    }
  );

  if (!result.ok) {
    return {
      success: false,
      error: `Nango returned ${result.status}`,
    };
  }

  const body = await result.json();

  return {
    success: true,
    credentials: body.credentials,
  };
};
