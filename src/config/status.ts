import type { UnitStatus } from '../types/floor';

/**
 * Estados comerciales de una unidad.
 *
 * Los colores están desaturados a propósito: sobre una escena oscura y sobria,
 * un verde o un rojo plenos abaratan la imagen al instante. Tienen que leerse
 * como información, no como un semáforo.
 *
 * OJO: estos valores están espejados en styles/_tokens.scss para la UI en DOM.
 * Si cambiás uno, cambiá el otro.
 */
export const UNIT_STATUS: Record<UnitStatus, { label: string; color: string }> = {
  disponible: { label: 'Disponible', color: '#6fae8b' },
  reservado: { label: 'Reservado', color: '#cf9a4a' },
  vendido: { label: 'Vendido', color: '#a8616a' },
};
