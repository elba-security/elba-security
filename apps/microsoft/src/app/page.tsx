import { formatMicrosoftConsentUrl } from '@/repositories/microsoft/graph-api';

export default function Home() {
  return <a href={formatMicrosoftConsentUrl()}>Connect elba to Microsoft</a>;
}
