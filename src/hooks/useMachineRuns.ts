import { useCallback, useEffect, useState } from 'react';
import { fetchMachineRuns } from '@/lib/api';
import type { MachineRun } from '@/types';

export function useMachineRuns(machineCode: string, limit = 20) {
  const [runs, setRuns] = useState<MachineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchMachineRuns(machineCode, limit);
      setRuns(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [machineCode, limit]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { runs, loading, error, refetch };
}
