/**
 * Ángulos de un recorrido virtual.
 *
 * El origen es la dirección en la que mira la cámara al abrirse el recorrido:
 * -Z es el frente. Entonces yaw 0 es "de frente", yaw positivo gira a la
 * derecha, y pitch 0 es el horizonte.
 *
 * Las dos funciones son inversas EXACTAS una de la otra, y de eso depende que
 * el modo calibración sirva de algo: el número que se copia tras hacer click
 * tiene que poner el marcador exactamente donde se hizo click. Si se
 * desincronizaran, cada salto quedaría corrido unos grados y nadie sabría por
 * qué.
 *
 * Viven sueltas, sin importar three ni React, para poder probar esa propiedad
 * directamente.
 */

/**
 * Los marcadores viven sobre una esfera más chica que la panorámica.
 *
 * A la cámara le da igual el radio —desde el centro, todo lo que esté sobre
 * una esfera se ve al mismo tamaño angular si escala con el radio— pero
 * acercarlos deja margen para que nunca queden detrás de la imagen.
 */
export const MARKER_RADIUS = 40;

export function anglesToPosition(
  yaw: number,
  pitch: number,
  radius = MARKER_RADIUS,
): [number, number, number] {
  const y = (yaw * Math.PI) / 180;
  const p = (pitch * Math.PI) / 180;

  return [
    radius * Math.cos(p) * Math.sin(y),
    radius * Math.sin(p),
    -radius * Math.cos(p) * Math.cos(y),
  ];
}

/**
 * De un punto de la esfera a los ángulos que lo describen.
 *
 * Redondea a grados enteros: un salto no necesita más precisión que eso, y un
 * número entero es lo que alguien puede leer, copiar y ajustar a mano después.
 */
export function positionToAngles(
  x: number,
  y: number,
  z: number,
): { yaw: number; pitch: number } {
  const length = Math.sqrt(x * x + y * y + z * z) || 1;

  return {
    yaw: Math.round((Math.atan2(x, -z) * 180) / Math.PI),
    pitch: Math.round((Math.asin(y / length) * 180) / Math.PI),
  };
}
