import { describe, expect, it } from 'vitest';

import { parsePaste } from '../src/admin/parsePaste';
import type { UnitRow } from '../src/admin/useUnits';

/**
 * La importación desde planilla es la función que decide si el panel se usa.
 * Sus casos borde vienen de lo que realmente sale de un Excel en español:
 * separador de miles con punto, símbolo de moneda, acentos, columnas vacías.
 */

const rows: UnitRow[] = [
  { id: 'floor-08-c', floorId: 'floor-08', label: 'C', status: 'disponible', price: 194500, gallery: [] },
  { id: 'floor-08-a', floorId: 'floor-08', label: 'A', status: 'vendido', price: null, gallery: [] },
  { id: 'floor-01-b', floorId: 'floor-01', label: 'B', status: 'reservado', price: 120000, gallery: [] },
];

describe('parsePaste', () => {
  it('reconoce el código comercial de la unidad', () => {
    const result = parsePaste('08C\tvendido', rows);
    expect(result.edits['floor-08-c']).toEqual({ status: 'vendido' });
    expect(result.matched).toBe(1);
  });

  it('también acepta el id crudo del documento', () => {
    const result = parsePaste('floor-01-b\tdisponible', rows);
    expect(result.edits['floor-01-b']).toEqual({ status: 'disponible' });
  });

  it('entiende precios con formato de planilla en español', () => {
    const result = parsePaste('08C\t\tUS$ 250.000', rows);
    expect(result.edits['floor-08-c']).toEqual({ price: 250000 });
  });

  it('acepta el precio sin formato', () => {
    const result = parsePaste('08C;;250000', rows);
    expect(result.edits['floor-08-c']).toEqual({ price: 250000 });
  });

  it('tolera acentos y mayúsculas en el estado', () => {
    // "Reservado" con mayúscula inicial es lo que escribe cualquiera.
    const result = parsePaste('08C\tReservado', rows);
    expect(result.edits['floor-08-c']).toEqual({ status: 'reservado' });
  });

  it('un guion significa sin precio publicado', () => {
    const result = parsePaste('01B\t\t-', rows);
    expect(result.edits['floor-01-b']).toEqual({ price: null });
  });

  it('ignora lo que no cambió', () => {
    // 08C ya está disponible a 194500: pegar lo mismo no es una edición.
    const result = parsePaste('08C\tdisponible\t194500', rows);
    expect(result.matched).toBe(0);
    expect(result.edits).toEqual({});
  });

  it('reporta códigos que no existen en el desarrollo', () => {
    const result = parsePaste('99Z\tvendido', rows);
    expect(result.unknown).toEqual(['99Z']);
    expect(result.matched).toBe(0);
  });

  it('reporta un estado inválido en vez de adivinar', () => {
    const result = parsePaste('08C\tregalada', rows);
    expect(result.invalid).toHaveLength(1);
    expect(result.edits).toEqual({});
  });

  it('rechaza un precio negativo', () => {
    const result = parsePaste('08C\t\t-500', rows);
    expect(result.invalid).toHaveLength(1);
  });

  it('procesa varias líneas y saltea las vacías', () => {
    const result = parsePaste('08C\tvendido\n\n01B\t\t130000\n', rows);
    expect(result.matched).toBe(2);
    expect(result.edits['floor-08-c']).toEqual({ status: 'vendido' });
    expect(result.edits['floor-01-b']).toEqual({ price: 130000 });
  });

  it('acepta solo la columna de precios', () => {
    const result = parsePaste('08C\t\t200000\n01B\t\t125000', rows);
    expect(Object.values(result.edits).every((edit) => 'price' in edit)).toBe(true);
  });
});
