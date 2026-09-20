import { useCallback, useEffect, useState } from 'react';
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';

import type { UnitStatus } from '../types/floor';
import { getAdminDb } from './firebase';

/**
 * Las unidades de un desarrollo, tal como están en Firestore.
 *
 * El panel lee de Firestore y no del archivo del desarrollo. Eso es
 * deliberado: el archivo es la definición estructural y no cambia; lo que el
 * panel edita es la capa comercial, que es lo que Firestore contiene. Si
 * leyera del archivo, mostraría precios que nadie puede editar.
 */

export interface UnitRow {
  id: string;
  floorId: string;
  label: string;
  status: UnitStatus;
  price: number | null;
  gallery: string[];
  updatedAt?: string;
  updatedBy?: string;
}

/** Lo que una fila puede cambiar. Cualquier otra cosa la rechazan las reglas. */
export type UnitEdit = Partial<Pick<UnitRow, 'status' | 'price' | 'gallery'>>;

/** Código comercial: "08C" a partir de floor-08 y C. */
export function unitCode(unit: Pick<UnitRow, 'floorId' | 'label'>): string {
  return `${unit.floorId.replace(/^floor-/, '')}${unit.label}`;
}

interface UnitsState {
  status: 'loading' | 'ready' | 'error';
  rows: UnitRow[];
  message?: string;
}

export function useUnits(slug: string | null) {
  const [state, setState] = useState<UnitsState>({ status: 'loading', rows: [] });

  const load = useCallback(async () => {
    if (!slug) {
      setState({ status: 'ready', rows: [] });
      return;
    }

    setState({ status: 'loading', rows: [] });

    try {
      const snapshot = await getDocs(collection(getAdminDb(), 'projects', slug, 'units'));

      const rows = snapshot.docs
        .map((entry) => {
          const data = entry.data() as Partial<UnitRow>;
          // Defensivo: una galería indefinida rompería el editor.
          return { ...data, gallery: data.gallery ?? [], id: entry.id } as UnitRow;
        })
        // Orden natural de una lista de precios: por piso y después por unidad.
        .sort((a, b) => a.floorId.localeCompare(b.floorId) || a.label.localeCompare(b.label));

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

  /**
   * Guarda los cambios pendientes.
   *
   * Escribe SOLO los campos editados más el sello de autoría. Mandar el
   * documento entero haría que las reglas lo rechacen: prohíben tocar campos
   * de estructura, y exigen que updatedBy coincida con quien firma el pedido.
   *
   * Un único lote: o entran todos los cambios o no entra ninguno. Dejar la
   * lista de precios a medio guardar sería peor que no guardarla.
   */
  const save = useCallback(
    async (edits: Record<string, UnitEdit>, uid: string) => {
      if (!slug) return;

      const ids = Object.keys(edits);
      if (ids.length === 0) return;

      const db = getAdminDb();
      const batch = writeBatch(db);
      const now = new Date().toISOString();

      for (const id of ids) {
        batch.update(doc(db, 'projects', slug, 'units', id), {
          ...edits[id],
          updatedAt: now,
          updatedBy: uid,
        });
      }

      await batch.commit();
      await load();
    },
    [slug, load],
  );

  return { ...state, reload: load, save };
}
