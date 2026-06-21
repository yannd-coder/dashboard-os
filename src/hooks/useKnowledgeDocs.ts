import { useCallback, useEffect, useState } from 'react';
import { fetchKnowledgeDocs } from '@/lib/api';
import type { KnowledgeDoc } from '@/types';

export function useKnowledgeDocs() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchKnowledgeDocs();
      setDocs(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { docs, loading, error, refetch };
}
