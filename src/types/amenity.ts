import type { Vec3 } from './scene';

/**
 * Un espacio del proyecto señalado con un hotspot.
 *
 * En fases posteriores este tipo crece (imágenes, recorrido, superficie) y se
 * le suman hermanos: Unit, Floor, Tower. Por eso vive en types/ y no adentro
 * del componente que lo dibuja.
 */
export interface Amenity {
  id: string;
  name: string;
  description: string;
  /** Punto en el espacio 3D donde se ancla el hotspot, en metros. */
  position: Vec3;
}
