import type { UnitStatus } from './floor';

/**
 * La capa comercial: lo único que vive en Firestore.
 *
 * La línea es deliberada. Va acá lo que cambia sin que el edificio cambie —
 * precio, disponibilidad, textos, imágenes— y se queda en el archivo del
 * proyecto todo lo que se midió una vez contra el modelo: alturas de losa,
 * footprints, superficies, posiciones de amenities.
 *
 * La razón es práctica: la calibración es trabajo visual e iterativo, y
 * hacerla contra una consola de base de datos en vez de un archivo con
 * recarga en caliente multiplica por diez el tiempo de dar de alta un
 * desarrollo. Firestore mejora lo que cambia seguido, no lo que se ajusta
 * mirando.
 */

/** Lo editable de una unidad. Todo opcional: lo ausente conserva el archivo. */
export interface UnitCommercial {
  status?: UnitStatus;
  /** Null publica la unidad sin precio. Ausente conserva el del archivo. */
  price?: number | null;
  /** Rutas dentro del almacenamiento, nunca URLs completas. */
  gallery?: string[];
}

/** Lo editable de un amenity. La posición 3D no está: es calibración. */
export interface AmenityCommercial {
  name?: string;
  description?: string;
  gallery?: string[];
}

export interface ProjectCommercial {
  slug: string;
  units: Record<string, UnitCommercial>;
  amenities: Record<string, AmenityCommercial>;
  /** ISO. Lo escribe el script de carga y, más adelante, el panel. */
  updatedAt?: string;
}
