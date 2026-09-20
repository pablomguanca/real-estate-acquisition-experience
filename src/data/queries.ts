import type { Floor, Unit } from '../types/floor';

/**
 * Consultas sobre los pisos de un desarrollo.
 *
 * Reciben los datos en vez de leerlos de una constante del módulo. Ese cambio
 * es lo que permite que la aplicación sirva a más de un desarrollo: mientras
 * las consultas conocieran una lista global, la plataforma sabía de un único
 * proyecto aunque el resto pareciera genérico.
 */

/** Los pisos se listan de arriba hacia abajo, como en un ascensor. */
export function floorsTopDown(floors: Floor[]): Floor[] {
  return [...floors].reverse();
}

export function countAvailable(floor: Floor): number {
  return floor.units.filter((unit) => unit.status === 'disponible').length;
}

export function findFloor(floors: Floor[], floorId: string | null): Floor | null {
  if (!floorId) return null;
  return floors.find((floor) => floor.id === floorId) ?? null;
}

export function findUnit(floors: Floor[], unitId: string | null): Unit | null {
  if (!unitId) return null;

  for (const floor of floors) {
    const unit = floor.units.find((candidate) => candidate.id === unitId);
    if (unit) return unit;
  }

  return null;
}
