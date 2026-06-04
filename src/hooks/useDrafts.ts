import { useCallback, useEffect, useState } from 'react';
import { fetchDrafts } from '@/lib/api';
import type { DraftStatus, PostDraft } from '@/types';

export function useDrafts(machineCode: string, status?: DraftStatus, limit = 30) {
  const [drafts, setDrafts] = useState<PostDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchDrafts(machineCode, status, limit);
      setDrafts(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [machineCode, status, limit]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { drafts, loading, error, refetch };
}
