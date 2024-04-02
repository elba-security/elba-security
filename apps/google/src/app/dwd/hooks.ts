import { useEffect, useRef } from 'react';

export const useInterval = (callback: () => void | Promise<void>, delayInMs: number | null) => {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delayInMs === null) {
      return;
    }

    const id = window.setInterval(() => void savedCallback.current(), delayInMs);

    return () => {
      window.clearInterval(id);
    };
  }, [delayInMs]);
};
