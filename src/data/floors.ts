import type { Floor, Unit, UnitFootprint, UnitStatus } from '../types/floor';
import { orientationOf } from './queries';

/**
 * Pisos y unidades de la torre.
 *
 * Las alturas coinciden con las losas del placeholder (primera a 6.7 m, una
 * cada 3 m). Están generadas y no escritas a mano porque son regulares; el
 * día que el edificio real tenga plantas distintas, este archivo pasa a ser
 * una lista explícita y ningún componente se entera.
 *
 * Todo lo comercial (superficie, ambientes, precio) sale de una tabla de
 * tipologías más una regla por altura. Escribir 44 fichas a mano sería
 * inventar ruido; esto es poco código y se lee de un vistazo.
 *
 * Esto es data de PROJECT 01, no de la plataforma: las consultas genéricas
 * sobre pisos viven en data/queries.ts y reciben los datos por parámetro.
 */

const FIRST_SLAB = 6.7;
const FLOOR_HEIGHT = 3;
const FLOOR_COUNT = 11;

/** Distribución de estado por piso. Se repite en ciclo. */
const STATUS_CYCLE: UnitStatus[][] = [
  ['disponible', 'disponible', 'reservado', 'vendido'],
  ['vendido', 'disponible', 'disponible', 'disponible'],
  ['disponible', 'reservado', 'vendido', 'vendido'],
  ['vendido', 'vendido', 'disponible', 'reservado'],
];

interface Typology {
  footprint: UnitFootprint;
  coveredArea: number;
  balconyArea: number;
  rooms: number;
  bathrooms: number;
}

/**
 * Planta tipo: cuatro unidades, una por cuadrante.
 *
 * La torre mide 15 × 13 m, así que cada cuadrante es de 7.5 × 6.5.
 *
 * Los volúmenes son deliberadamente algo MÁS grandes que su cuadrante: el
 * núcleo opaco de la torre llega a ±6.7 en x y ±5.7 en z, así que una caja
 * ajustada al cuadrante queda enterrada adentro del edificio y no se ve desde
 * afuera. Sobresaliendo un par de decímetros por fuera de la losa, la cara
 * exterior queda a la vista y se lee como una banda sobre la fachada.
 *
 * El orden recorre el perímetro (frente-izquierda, frente-derecha,
 * contrafrente-derecha, contrafrente-izquierda), que es como se numeran las
 * unidades en un plano. El frente es +Z, que tomamos como norte.
 */
const TYPOLOGIES: Record<string, Typology> = {
  A: {
    footprint: { offset: [-3.95, 3.45], size: [7.7, 6.7] },
    coveredArea: 42,
    balconyArea: 6,
    rooms: 2,
    bathrooms: 1,
  },
  B: {
    footprint: { offset: [3.95, 3.45], size: [7.7, 6.7] },
    coveredArea: 58,
    balconyArea: 9,
    rooms: 3,
    bathrooms: 2,
  },
  C: {
    footprint: { offset: [3.95, -3.45], size: [7.7, 6.7] },
    coveredArea: 56,
    balconyArea: 8,
    rooms: 3,
    bathrooms: 2,
  },
  D: {
    footprint: { offset: [-3.95, -3.45], size: [7.7, 6.7] },
    coveredArea: 44,
    balconyArea: 7,
    rooms: 2,
    bathrooms: 1,
  },
};

const UNIT_LABELS = Object.keys(TYPOLOGIES);

/** Precio por m² al nivel 1, y cuánto suma cada piso de altura. */
const BASE_PRICE_PER_M2 = 2600;
const PRICE_PER_LEVEL = 55;

function priceOf(area: number, level: number, status: UnitStatus): number | null {
  if (status === 'vendido') return null;

  const perM2 = BASE_PRICE_PER_M2 + level * PRICE_PER_LEVEL;
  // Redondeo comercial: nadie publica un precio terminado en 37.
  return Math.round((area * perM2) / 500) * 500;
}

function buildUnits(floorId: string, index: number, level: number): Unit[] {
  const statuses = STATUS_CYCLE[index % STATUS_CYCLE.length]!;

  return UNIT_LABELS.map((label, unitIndex) => {
    const typology = TYPOLOGIES[label]!;
    const status = statuses[unitIndex]!;
    const area = typology.coveredArea + typology.balconyArea;

    return {
      id: `${floorId}-${label.toLowerCase()}`,
      floorId,
      label,
      // En este desarrollo la unidad y la tipología coinciden: cada planta
      // repite las mismas cuatro. En un edificio real no tiene por qué.
      typology: label,
      status,
      footprint: typology.footprint,

      area,
      coveredArea: typology.coveredArea,
      balconyArea: typology.balconyArea,
      rooms: typology.rooms,
      bathrooms: typology.bathrooms,
      orientation: orientationOf(typology.footprint),

      price: priceOf(area, level, status),

      // Sin fotos todavía. La galería se oculta sola mientras esté vacío.
      gallery: [],
    };
  });
}

export const FLOORS: Floor[] = Array.from({ length: FLOOR_COUNT }, (_, index) => {
  const level = index + 1;
  const id = `floor-${String(level).padStart(2, '0')}`;

  return {
    id,
    level,
    label: String(level).padStart(2, '0'),
    elevation: FIRST_SLAB + index * FLOOR_HEIGHT,
    // Algo menos que la altura entre losas, para que los volúmenes de
    // selección de pisos contiguos no se toquen y el raycast no dude.
    height: FLOOR_HEIGHT - 0.2,
    units: buildUnits(id, index, level),
  };
});
