/**
 * Pisos y unidades de la torre.
 *
 * Separado de amenity.ts porque son ejes distintos del proyecto: los
 * amenities son espacios comunes señalados en la escena, los pisos son la
 * estructura vendible. En Fase 5 los dos van a venir de Firestore, pero por
 * colecciones diferentes.
 */

export type UnitStatus = 'disponible' | 'reservado' | 'vendido';

/**
 * Porción de la planta que ocupa una unidad, en metros y relativa al centro
 * de la torre.
 *
 * Vive en cada unidad y no en una constante compartida aunque hoy todos los
 * pisos tengan la misma planta: en un edificio real las plantas altas suelen
 * diferir, y el día que eso pase no hay que cambiar el modelo, solo los datos.
 */
export interface UnitFootprint {
  /** Desplazamiento [x, z] respecto del eje de la torre. */
  offset: [number, number];
  /** Dimensiones [ancho, profundidad]. */
  size: [number, number];
}

/**
 * Orientación de la unidad, derivada del cuadrante que ocupa.
 *
 * Se calcula desde el footprint y no se escribe a mano: si la planta cambia,
 * la orientación acompaña sola. Una ficha que dice "noreste" sobre una unidad
 * dibujada al suroeste destruye la credibilidad de todo el resto.
 */
export type Orientation = 'Noreste' | 'Noroeste' | 'Sureste' | 'Suroeste';

export interface Unit {
  id: string;
  floorId: string;
  /** Identificador comercial dentro del piso: "A", "B", "C"... */
  label: string;
  status: UnitStatus;
  footprint: UnitFootprint;

  /** Superficie total en m² (cubierta + balcón). */
  area: number;
  coveredArea: number;
  balconyArea: number;

  rooms: number;
  bathrooms: number;
  orientation: Orientation;

  /**
   * Precio de lista en dólares.
   *
   * Null cuando no corresponde publicarlo: en una unidad vendida el precio
   * no es información útil y ensucia la ficha.
   */
  price: number | null;

  /**
   * Rutas a imágenes dentro de /public. Vacío mientras no existan: la galería
   * se oculta sola en vez de mostrar huecos.
   */
  gallery: string[];
}

export interface Floor {
  id: string;
  /** Número de piso tal como se comercializa. */
  level: number;
  /** Etiqueta mostrada al usuario: "01", "02", "Roof". */
  label: string;
  /**
   * Altura de la losa, en metros.
   *
   * Es la pieza que hace migrable toda la Fase 2: el volumen de selección se
   * construye a partir de este número, no de la geometría del modelo. Cuando
   * llegue el GLB real se recalibran estos valores y nada más.
   */
  elevation: number;
  /** Altura libre del piso, para dimensionar el volumen de selección. */
  height: number;
  units: Unit[];
}
