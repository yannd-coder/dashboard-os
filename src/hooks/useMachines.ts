import { useEffect, useState } from 'react';
import { fetchMachines } from '@/lib/api';
import type { Machine } from '@/types';

export function useMachines() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMachines()
      .then((rows) => {
        if (!cancelled) setMachines(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { machines, loading, error };
}
