import type { TerrainSettings } from '../types/scene';

/**
 * Relieve del sitio.
 *
 * Fuente única de verdad de la altura del suelo: el terreno se construye con
 * esta función, y todo lo que tenga que apoyarse encima (edificios vecinos,
 * arboleda) la consulta en vez de adivinar. Si el relieve cambia, nada queda
 * flotando ni enterrado.
 *
 * El ruido es determinista: la misma coordenada devuelve siempre la misma
 * altura, sin semillas ni aleatoriedad guardada. Eso importa porque el
 * contexto se genera en cada montaje y tiene que caer siempre igual.
 */

function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Ruido de valor bilineal con interpolación suave. */
function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const u = smoothstep(xf);
  const v = smoothstep(yf);

  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);

  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/**
 * Tres octavas: la primera da las colinas, las siguientes el detalle.
 * Más octavas no se notan a esta escala y cuestan vértices.
 */
function fbm(x: number, y: number): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;

  for (let octave = 0; octave < 3; octave += 1) {
    value += valueNoise(x * frequency, y * frequency) * amplitude;
    amplitude *= 0.5;
    frequency *= 2.1;
  }

  return value;
}

/**
 * Altura del suelo en un punto del plano, en metros.
 *
 * Recibe los ajustes en vez de leerlos de una constante: el relieve es parte
 * de la descripción del desarrollo, y dos proyectos en el mismo sistema no
 * comparten terreno.
 */
export function terrainHeight(x: number, z: number, terrain: TerrainSettings): number {
  const distance = Math.hypot(x, z);

  if (distance <= terrain.flatRadius) return 0;

  // Transición suave entre el lote nivelado y el relieve natural.
  const t = Math.min(
    (distance - terrain.flatRadius) / (terrain.falloffRadius - terrain.flatRadius),
    1,
  );
  const mask = smoothstep(t);

  // Centrado en cero para que el terreno baje tanto como sube y el lote no
  // quede siempre en el fondo de un cuenco.
  const noise = fbm(x * terrain.frequency, z * terrain.frequency) - 0.5;

  return noise * terrain.amplitude * mask;
}
