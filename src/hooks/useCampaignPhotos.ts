import { useCallback, useEffect, useState } from 'react';
import { fetchCampaignPhotos } from '@/lib/api';
import type { CampaignPhoto } from '@/types';

export function useCampaignPhotos() {
  const [photos, setPhotos] = useState<CampaignPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchCampaignPhotos();
      setPhotos(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { photos, loading, error, refetch };
}
