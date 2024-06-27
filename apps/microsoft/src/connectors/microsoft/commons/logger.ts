export const formatLoggerResponse = async (response: Response) => ({
  status: response.status,
  data: (await response
    .clone()
    .json()
    .catch(() => ({}))) as unknown,
  body: await response
    .clone()
    .text()
    .catch(() => ''),
});
