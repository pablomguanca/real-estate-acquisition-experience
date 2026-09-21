import { describe, expect, it } from 'vitest';

import { amenityHistory, assertBatchSize, unitHistory } from '../src/admin/history';
import type { AmenityRow } from '../src/admin/useAmenities';
import type { UnitRow } from '../src/admin/useUnits';

/**
 * El historial es lo que respalda un reclamo sobre un precio publicado. Si
 * anota de más, nadie lo lee; si anota de menos, no sirve de nada. Estos
 * casos fijan exactamente dónde está esa línea.
 */

const AUTHOR = { uid: 'uid-ana', email: 'ana@desarrolladora.com' };
const AT = '2026-09-20T18:00:00.000Z';

const units: UnitRow[] = [
  {
    id: 'floor-08-c',
    floorId: 'floor-08',
    label: 'C',
    status: 'disponible',
    price: 194500,
    gallery: [],
  },
  {
    id: 'floor-01-b',
    floorId: 'floor-01',
    label: 'B',
    status: 'reservado',
    price: null,
    gallery: ['a.webp'],
  },
];

const amenities: AmenityRow[] = [
  { id: 'pool', name: 'Piscina', description: 'Espejo de agua.', gallery: [] },
];

describe('unitHistory', () => {
  it('anota el valor anterior y el nuevo', () => {
    const [entry, ...rest] = unitHistory(units, { 'floor-08-c': { price: 250000 } }, AUTHOR, AT);

    expect(rest).toHaveLength(0);
    expect(entry).toMatchObject({
      entity: 'unit',
      entityId: 'floor-08-c',
      label: '08C',
      field: 'price',
      from: '194500',
      to: '250000',
      by: 'uid-ana',
      byEmail: 'ana@desarrolladora.com',
      at: AT,
    });
  });

  it('separa en una anotación por campo', () => {
    // Bajar el precio y marcar vendido en el mismo guardado son dos hechos.
    const entries = unitHistory(
      units,
      { 'floor-08-c': { price: 180000, status: 'vendido' } },
      AUTHOR,
      AT,
    );

    expect(entries.map((e) => e.field).sort()).toEqual(['price', 'status']);
  });

  it('no anota un campo que volvió a su valor original', () => {
    const entries = unitHistory(units, { 'floor-08-c': { price: 194500 } }, AUTHOR, AT);
    expect(entries).toEqual([]);
  });

  it('distingue sin precio de precio cero', () => {
    const entries = unitHistory(units, { 'floor-01-b': { price: 0 } }, AUTHOR, AT);

    // El anterior era null: "—", no "0". Confundirlos borraría la diferencia
    // entre "no publicamos precio" y "lo publicamos en cero".
    expect(entries[0]).toMatchObject({ from: '—', to: '0' });
  });

  it('resume la galería por cantidad', () => {
    const entries = unitHistory(
      units,
      { 'floor-08-c': { gallery: ['x.webp', 'y.webp'] } },
      AUTHOR,
      AT,
    );

    expect(entries[0]).toMatchObject({ from: '0 imágenes', to: '2 imágenes' });
  });

  it('usa el singular con una sola imagen', () => {
    const entries = unitHistory(units, { 'floor-08-c': { gallery: ['x.webp'] } }, AUTHOR, AT);
    expect(entries[0]!.to).toBe('1 imagen');
  });

  it('ignora una edición sobre una fila que ya no existe', () => {
    // Sin valor anterior no hay nada que anotar, y inventarlo sería peor.
    const entries = unitHistory(units, { 'floor-99-z': { price: 1 } }, AUTHOR, AT);
    expect(entries).toEqual([]);
  });

  it('no inventa anotaciones cuando no hay ediciones', () => {
    expect(unitHistory(units, {}, AUTHOR, AT)).toEqual([]);
  });
});

describe('amenityHistory', () => {
  it('anota el texto anterior y el nuevo', () => {
    const entries = amenityHistory(
      amenities,
      { pool: { description: 'Espejo de agua con solárium.' } },
      AUTHOR,
      AT,
    );

    expect(entries[0]).toMatchObject({
      entity: 'amenity',
      label: 'Piscina',
      field: 'description',
      from: 'Espejo de agua.',
      to: 'Espejo de agua con solárium.',
    });
  });

  it('recorta los textos largos', () => {
    const entries = amenityHistory(
      amenities,
      { pool: { description: 'x'.repeat(600) } },
      AUTHOR,
      AT,
    );

    expect(entries[0]!.to).toHaveLength(200);
  });
});

describe('assertBatchSize', () => {
  it('deja pasar un guardado normal', () => {
    expect(() => assertBatchSize(120)).not.toThrow();
  });

  it('frena antes del límite de Firestore', () => {
    // 500 operaciones es el tope del lote; avisar antes evita un error
    // ilegible del SDK a mitad de una importación grande.
    expect(() => assertBatchSize(480)).toThrow(/tandas/);
  });
});
