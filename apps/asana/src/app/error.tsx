'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      {error.name ? <h2>{error.message}</h2> : <h2>Something went wrong</h2>}
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
