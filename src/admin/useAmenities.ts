import { useCallback, useEffect, useState } from 'react';
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';

import { getAdminDb } from './firebase';
import { type Author, amenityHistory, assertBatchSize } from './history';

/**
 * Los espacios comunes de un desarrollo, en su capa editable.
 *
 * Solo texto e imágenes: la posición 3D de cada amenity no está acá porque es
 * calibración y vive en el archivo del desarrollo. Mover la pileta en el panel
 * significaría que un comercial puede descalibrar la escena.
 */

export interface AmenityRow {
  id: string;
  name: string;
  description: string;
  gallery: string[];
  updatedAt?: string;
  updatedBy?: string;
}

export type AmenityEdit = Partial<Pick<AmenityRow, 'name' | 'description' | 'gallery'>>;

interface AmenitiesState {
  status: 'loading' | 'ready' | 'error';
  rows: AmenityRow[];
  message?: string;
}

export function useAmenities(slug: string | null) {
  const [state, setState] = useState<AmenitiesState>({ status: 'loading', rows: [] });

  const load = useCallback(async () => {
    if (!slug) {
      setState({ status: 'ready', rows: [] });
      return;
    }

    setState({ status: 'loading', rows: [] });

    try {
      const snapshot = await getDocs(
        collection(getAdminDb(), 'projects', slug, 'amenities'),
      );

      const rows = snapshot.docs
        .map((entry) => {
          const data = entry.data() as Partial<AmenityRow>;

          return {
            id: entry.id,
            // Defensivo: un documento cargado a mano puede no traer todos los
            // campos, y una galería indefinida rompería el editor.
            name: data.name ?? entry.id,
            description: data.description ?? '',
            gallery: data.gallery ?? [],
            updatedAt: data.updatedAt,
            updatedBy: data.updatedBy,
          } satisfies AmenityRow;
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      setState({ status: 'ready', rows });
    } catch (error) {
      setState({
        status: 'error',
        rows: [],
        message: error instanceof Error ? error.message : 'Error desconocido.',
      });
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (edits: Record<string, AmenityEdit>, author: Author) => {
      if (!slug) return;

      const ids = Object.keys(edits);
      if (ids.length === 0) return;

      const db = getAdminDb();
      const batch = writeBatch(db);
      const now = new Date().toISOString();

      const entries = amenityHistory(state.rows, edits, author, now);

      // El cambio y su anotación viajan en el mismo lote: si el historial no
      // se puede escribir, el cambio tampoco entra. Un precio modificado sin
      // rastro es justamente lo que este registro existe para impedir.
      assertBatchSize(ids.length + entries.length);

      for (const id of ids) {
        batch.update(doc(db, 'projects', slug, 'amenities', id), {
          ...edits[id],
          updatedAt: now,
          updatedBy: author.uid,
        });
      }

      for (const entry of entries) {
        batch.set(doc(collection(db, 'projects', slug, 'history')), entry);
      }

      await batch.commit();
      await load();
    },
    [slug, load, state.rows],
  );

  return { ...state, reload: load, save };
}
