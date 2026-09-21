import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';

import { getAdminDb } from './firebase';
import type { HistoryEntry } from './history';

/**
 * Lectura del historial de un desarrollo.
 *
 * Trae las últimas anotaciones y no todas: un desarrollo con años de vida
 * puede acumular miles, y nadie revisa un precio de hace tres años bajando
 * por una lista infinita. Si alguna vez hace falta llegar más atrás, se busca
 * por unidad; para eso cada anotación guarda entityId.
 */

const PAGE = 200;

export interface HistoryState {
  status: 'loading' | 'ready' | 'error';
  entries: HistoryEntry[];
  /** Verdadero si puede haber anotaciones más viejas sin traer. */
  truncated: boolean;
  message?: string;
}

export function useHistory(slug: string | null) {
  const [state, setState] = useState<HistoryState>({
    status: 'loading',
    entries: [],
    truncated: false,
  });

  const load = useCallback(async () => {
    if (!slug) {
      setState({ status: 'ready', entries: [], truncated: false });
      return;
    }

    setState({ status: 'loading', entries: [], truncated: false });

    try {
      const snapshot = await getDocs(
        query(
          collection(getAdminDb(), 'projects', slug, 'history'),
          orderBy('at', 'desc'),
          limit(PAGE),
        ),
      );

      setState({
        status: 'ready',
        entries: snapshot.docs.map((entry) => entry.data() as HistoryEntry),
        truncated: snapshot.size === PAGE,
      });
    } catch (error) {
      setState({
        status: 'error',
        entries: [],
        truncated: false,
        message: error instanceof Error ? error.message : 'Error desconocido.',
      });
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
}
