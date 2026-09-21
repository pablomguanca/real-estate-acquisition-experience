import { normalizePrice, normalizeStatus } from '../data/spreadsheet';
import { type UnitEdit, type UnitRow, unitCode } from './useUnits';

/**
 * Importación desde planilla.
 *
 * Es la función que decide si el panel se usa o se abandona. Editar cuarenta
 * precios de a uno es tedioso pero tolerable; editar cuatrocientos no lo hace
 * nadie, y el comercial vuelve a mandarte el Excel por mail.
 *
 * Acepta lo que sale de copiar celdas: columnas separadas por tabulación,
 * punto y coma o coma, en el orden unidad · estado · precio. El estado y el
 * precio son opcionales, así que se puede pegar solo una columna de precios.
 *
 * No escribe nada: produce ediciones pendientes para que la persona las revise
 * en la tabla antes de guardar. Una importación que guarda sola es una manera
 * rápida de publicar cuatrocientos precios equivocados.
 */

export interface PasteResult {
  edits: Record<string, UnitEdit>;
  matched: number;
  /** Códigos que no corresponden a ninguna unidad del desarrollo. */
  unknown: string[];
  /** Líneas que no se pudieron interpretar. */
  invalid: string[];
}

export function parsePaste(text: string, rows: UnitRow[]): PasteResult {
  const byCode = new Map(rows.map((row) => [unitCode(row).toUpperCase(), row]));
  const byId = new Map(rows.map((row) => [row.id.toUpperCase(), row]));

  const edits: Record<string, UnitEdit> = {};
  const unknown: string[] = [];
  const invalid: string[] = [];

  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '') continue;

    const cells = line.split(/\t|;|,(?=\s*\S)/).map((cell) => cell.trim());
    const [code, rawStatus = '', rawPrice = ''] = cells;

    if (!code) {
      invalid.push(line);
      continue;
    }

    const key = code.toUpperCase();
    const row = byCode.get(key) ?? byId.get(key);

    if (!row) {
      unknown.push(code);
      continue;
    }

    const edit: UnitEdit = {};

    if (rawStatus !== '') {
      const status = normalizeStatus(rawStatus);
      if (!status) {
        invalid.push(line);
        continue;
      }
      if (status !== row.status) edit.status = status;
    }

    if (rawPrice !== '') {
      const price = normalizePrice(rawPrice);
      if (price === undefined) {
        invalid.push(line);
        continue;
      }
      if (price !== row.price) edit.price = price;
    }

    // Solo cuenta como cambio lo que realmente difiere de lo guardado.
    if (Object.keys(edit).length > 0) edits[row.id] = edit;
  }

  return { edits, matched: Object.keys(edits).length, unknown, invalid };
}
