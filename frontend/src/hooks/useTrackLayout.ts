// Hook to fetch track layout from backend

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import type { TrackLayout } from '../types/track';

export function useTrackLayout(
  seed: string,
  width: number,
  height: number,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
) {
  const [layout, setLayout] = useState<TrackLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!seed) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      seed,
      width: width.toString(),
      height: height.toString(),
      difficulty,
    });

    const url = `${API_BASE_URL}/api/track?${params}`;
    console.log('[useTrackLayout] Fetching track from:', url);

    fetch(url)
      .then((res) => {
        console.log('[useTrackLayout] Response status:', res.status);
        if (!res.ok) {
          throw new Error(`Failed to fetch track: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data: TrackLayout) => {
        console.log('[useTrackLayout] Track layout received:', data);
        setLayout(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[useTrackLayout] Error:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [seed, width, height, difficulty]);

  return { layout, loading, error };
}
