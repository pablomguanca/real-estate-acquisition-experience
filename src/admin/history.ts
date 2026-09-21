import type { AmenityEdit, AmenityRow } from './useAmenities';
import { type UnitEdit, type UnitRow, unitCode } from './useUnits';

/**
 * Registro de cambios.
 *
 * Hasta acá cada documento guardaba quién lo tocó por última vez y cuándo.
 * Eso responde "quién fue el último", que no es la pregunta que importa
 * cuando alguien reclama por un precio publicado. La pregunta es "qué decía
 * antes, quién lo cambió y en qué momento", y para eso hace falta una
 * anotación por cambio, no un sello que se pisa a sí mismo.
 *
 * Una entrada por CAMPO y no por documento: si en un mismo guardado alguien
 * baja el precio y marca la unidad como vendida, son dos hechos distintos y
 * se leen como dos líneas.
 *
 * Los valores se guardan como texto ya resuelto. La alternativa —guardar el
 * dato crudo— obliga a que el historial siga entendiendo para siempre la
 * forma que tenían los documentos en cada época. Una anotación es un
 * testimonio: tiene que poder leerse sola dentro de tres años, aunque el
 * esquema haya cambiado dos veces.
 *
 * LÍMITE CONOCIDO: esto lo escribe el cliente, en el mismo lote que el cambio.
 * Las reglas impiden falsificar el autor y borrar o editar lo ya escrito, así
 * que lo que está anotado es confiable. Pero alguien con credenciales que
 * saltee el panel y escriba contra la API puede cambiar un precio SIN dejar
 * anotación. Cerrar eso del todo requiere un disparador de Cloud Functions
 * del lado del servidor. Ver comentario en firestore.rules.
 */

export type HistoryEntity = 'unit' | 'amenity';
export type HistoryField = 'status' | 'price' | 'gallery' | 'name' | 'description';

export interface HistoryEntry {
  /** ISO. Mismo instante que el sello del documento. */
  at: string;
  by: string;
  /** Desnormalizado para poder leer el historial sin resolver cada uid. */
  byEmail: string;
  entity: HistoryEntity;
  entityId: string;
  /** Cómo se llamaba la cosa cuando se la tocó: "08C", "Piscina". */
  label: string;
  field: HistoryField;
  from: string;
  to: string;
}

export interface Author {
  uid: string;
  email: string;
}

/** Los textos largos se recortan: el historial es un índice, no un archivo. */
const MAX_TEXT = 200;

function describe(field: HistoryField, value: unknown): string {
  if (field === 'gallery') {
    const count = Array.isArray(value) ? value.length : 0;
    return `${count} ${count === 1 ? 'imagen' : 'imágenes'}`;
  }

  if (value === null || value === undefined || value === '') return '—';

  return String(value).slice(0, MAX_TEXT);
}

function diff<TRow extends { id: string }, TEdit extends object>(
  entity: HistoryEntity,
  fields: readonly HistoryField[],
  rows: TRow[],
  edits: Record<string, TEdit>,
  label: (row: TRow) => string,
  author: Author,
  at: string,
): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  const byId = new Map(rows.map((row) => [row.id, row]));

  for (const [id, edit] of Object.entries(edits)) {
    const row = byId.get(id);
    // Una edición sobre una fila que ya no está no se puede describir: no hay
    // valor anterior que anotar. Se saltea en vez de inventar uno.
    if (!row) continue;

    for (const field of fields) {
      if (!(field in edit)) continue;

      const from = describe(field, (row as Record<string, unknown>)[field]);
      const to = describe(field, (edit as Record<string, unknown>)[field]);

      // Cambiar una galería por otra del mismo tamaño no cambia el texto.
      // Anotarlo igual llenaría el historial de líneas que no dicen nada.
      if (from === to) continue;

      entries.push({
        at,
        by: author.uid,
        byEmail: author.email,
        entity,
        entityId: id,
        label: label(row),
        field,
        from,
        to,
      });
    }
  }

  return entries;
}

export function unitHistory(
  rows: UnitRow[],
  edits: Record<string, UnitEdit>,
  author: Author,
  at: string,
): HistoryEntry[] {
  return diff('unit', ['status', 'price', 'gallery'], rows, edits, unitCode, author, at);
}

export function amenityHistory(
  rows: AmenityRow[],
  edits: Record<string, AmenityEdit>,
  author: Author,
  at: string,
): HistoryEntry[] {
  return diff(
    'amenity',
    ['name', 'description', 'gallery'],
    rows,
    edits,
    (row) => row.name,
    author,
    at,
  );
}

/**
 * Un lote de Firestore admite 500 operaciones, y ahora cada cambio viaja con
 * su anotación, así que el tope real de filas editables es más bajo.
 *
 * Avisar acá con un mensaje entendible es mejor que dejar que el SDK rechace
 * el lote entero con un error que el usuario no puede interpretar.
 */
export function assertBatchSize(operations: number): void {
  if (operations > 450) {
    throw new Error(
      'Demasiados cambios en un solo guardado. Guardá en tandas más chicas.',
    );
  }
}
