import type { UnitStatus } from '../types/floor';

/**
 * Qué significa una celda de una planilla en español.
 *
 * Vive suelto y sin dependencias porque lo usan dos caminos muy distintos: el
 * panel, cuando alguien pega columnas de su Excel, y el script de alta, que
 * arma un desarrollo entero desde un CSV. Si cada uno tuviera su propia
 * interpretación de "US$ 250.000" o de "Reservado", tarde o temprano una
 * importación y un pegado darían resultados distintos sobre el mismo archivo.
 *
 * No sabe nada de Firestore ni de React: es la capa que traduce lo que
 * escribe una persona a lo que entiende el sistema.
 */

const STATUSES: UnitStatus[] = ['disponible', 'reservado', 'vendido'];

/** Minúsculas y sin acentos: "Reservado" y "reservado" son lo mismo. */
export function fold(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function normalizeStatus(value: string): UnitStatus | null {
  const clean = fold(value);
  return STATUSES.find((status) => status === clean) ?? null;
}

/**
 * Precio de planilla a número.
 *
 * Tres resultados distintos, y la diferencia importa:
 *   número     el precio publicado
 *   null       "sin precio publicado" — un guion, vacío explícito, "s/d"
 *   undefined  no se pudo interpretar: es un error, no un dato
 */
export function normalizePrice(value: string): number | null | undefined {
  const clean = value.trim();
  if (clean === '') return undefined;
  if (/^(null|-|s\/d|sin precio)$/i.test(clean)) return null;

  const digits = clean
    .replace(/[^\d,.-]/g, '')
    // Punto como separador de miles: "250.000" son doscientos cincuenta mil.
    .replace(/\.(?=\d{3}\b)/g, '')
    .replace(',', '.');

  const parsed = Number(digits);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

/** Número simple de planilla: superficies, ambientes, alturas. */
export function normalizeNumber(value: string): number | undefined {
  const clean = value.trim();
  if (clean === '') return undefined;

  const parsed = Number(clean.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));

  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Separa una línea en celdas respetando comillas.
 *
 * Excel entrecomilla cualquier campo que contenga el separador, y un
 * `split(',')` a secas parte "Cocina, comedor" en dos columnas y desplaza
 * todo lo que sigue.
 */
export function splitCells(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;

    if (quoted) {
      // Dos comillas seguidas dentro de un campo son una comilla literal.
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === delimiter) {
      cells.push(current);
      current = '';
    } else current += char;
  }

  cells.push(current);

  return cells.map((cell) => cell.trim());
}

/**
 * Con qué está separado el archivo.
 *
 * Se decide mirando el encabezado y no se pide como parámetro: un Excel
 * argentino exporta con punto y coma, uno en inglés con coma, y copiar y
 * pegar da tabulaciones. Pedirle a alguien que sepa cuál tiene es pedirle que
 * abra el archivo en un editor de texto.
 */
export function detectDelimiter(headerLine: string): string {
  const counts = [
    ['\t', headerLine.split('\t').length],
    [';', headerLine.split(';').length],
    [',', headerLine.split(',').length],
  ] as const;

  return counts.reduce((best, current) => (current[1] > best[1] ? current : best))[0];
}
