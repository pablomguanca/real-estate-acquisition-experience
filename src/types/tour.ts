/**
 * Recorrido virtual de una tipología.
 *
 * Una panorámica equirectangular por ambiente, mapeada sobre el interior de
 * una esfera con la cámara en el centro. Es lo que usa toda la industria, y
 * la razón es sencilla: una imagen calculada durante horas en un render
 * offline le gana a cualquier interior en tiempo real, pesa una fracción y
 * anda en cualquier teléfono.
 *
 * Se guarda por TIPOLOGÍA y no por unidad. El 1603 y el 0803 son el mismo
 * departamento a distinta altura, así que comparten recorrido. Lo que cambia
 * con la altura es la vista por la ventana, que es otra cosa y usa esta misma
 * maquinaria con otro origen.
 */

/**
 * Salto de un ambiente a otro, anclado a un punto de la panorámica.
 *
 * Es lo que convierte una lista de fotos en un recorrido: se toca la puerta
 * del dormitorio y se entra al dormitorio, en vez de volver a un menú.
 *
 * Los ángulos son GRADOS, y el origen está donde mira la cámara al abrirse
 * el recorrido: yaw 0 es el frente, positivo hacia la derecha; pitch 0 es el
 * horizonte, negativo hacia el piso. Se miden con el modo calibración en vez
 * de a ojo — ver el modo ?calibrate=1 dentro del recorrido.
 */
export interface TourLink {
  /** Identificador del ambiente al que lleva. */
  to: string;
  /** Grados a la derecha del frente. */
  yaw: number;
  /** Grados sobre el horizonte. */
  pitch: number;
  /** Texto del marcador. Por defecto, el nombre del ambiente destino. */
  label?: string;
}

export interface TourRoom {
  /** Identificador dentro del recorrido: "living", "dormitorio-1". */
  id: string;
  /** Lo que se muestra en la lista de ambientes: "Living comedor". */
  name: string;
  /**
   * Ruta a la panorámica equirectangular, nunca una URL.
   *
   * Proporción 2:1 —4096 × 2048 es el tamaño habitual— y el resolvedor de
   * medios decide de dónde sale, igual que con el resto de las imágenes.
   */
  panorama: string;
  /**
   * Adónde se puede ir desde acá.
   *
   * Opcional: sin saltos el recorrido sigue funcionando con la lista de
   * ambientes de abajo. Los saltos son el refinamiento, no el requisito.
   */
  links?: TourLink[];
}

/** Los recorridos de un desarrollo, indexados por tipología. */
export type ProjectTours = Record<string, TourRoom[]>;
