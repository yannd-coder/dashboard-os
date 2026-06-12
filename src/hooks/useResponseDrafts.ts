import { useCallback, useEffect, useState } from 'react';
import { fetchResponseDrafts } from '@/lib/api';
import type { ResponseDraft, ResponseDraftStatus } from '@/types';

export function useResponseDrafts(status?: ResponseDraftStatus, limit = 30) {
  const [drafts, setDrafts] = useState<ResponseDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchResponseDrafts(status, limit);
      setDrafts(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [status, limit]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { drafts, loading, error, refetch };
}
