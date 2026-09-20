import { useMemo } from 'react';

/**
 * Maqueta arquitectónica provisional.
 *
 * Existe para poder calibrar cámara, iluminación y hotspots antes de que
 * exista el GLB real. Cuando llegue el modelo, este archivo se borra entero:
 * ningún otro componente lo importa directamente, solo Building.tsx.
 *
 * Volúmenes, de abajo hacia arriba:
 *   explanada · lobby vidriado · torre con losas y barandas · remate
 * más un ala baja de amenities con pileta, que además da destinos naturales
 * a los hotspots del Tramo 2.
 */

/**
 * Valores deliberadamente medios, no claros.
 *
 * Con hormigón casi blanco el sol satura la cara iluminada y el cielo levanta
 * la cara en sombra: todo se comprime en la parte alta del rango y el volumen
 * se pierde. Partiendo de un gris medio, la cara al sol sube a claro y la
 * cara en sombra baja a oscuro, que es de donde sale el contraste.
 */
const PALETTE = {
  concrete: '#8b8a87',
  concreteDark: '#6c6b69',
  slab: '#a5a4a1',
  glass: '#27303a',
  railing: '#6a7682',
  stone: '#555553',
  water: '#153f4d',
};

const TOWER = {
  bottom: 3.7,
  top: 37.7,
  firstSlab: 6.7,
  lastSlab: 36.7,
  floorHeight: 3,
  width: 15,
  depth: 13,
};

/** Posiciones en X de los montantes verticales del vidriado. */
const MULLIONS_X = [-5.4, -2.7, 0, 2.7, 5.4];

export function PlaceholderBuilding() {
  // Las alturas de losa se calculan una sola vez, no en cada render.
  const slabHeights = useMemo(() => {
    const heights: number[] = [];
    for (let y = TOWER.firstSlab; y <= TOWER.lastSlab; y += TOWER.floorHeight) {
      heights.push(y);
    }
    return heights;
  }, []);

  const towerHeight = TOWER.top - TOWER.bottom;
  const towerCenter = (TOWER.bottom + TOWER.top) / 2;

  return (
    <group>
      {/* Explanada: separa el conjunto del terreno y le da asiento.
          El terreno en sí es de Terrain.tsx: es el sitio, no el edificio. */}
      <mesh position={[0, 0.2, 0]} receiveShadow>
        <boxGeometry args={[56, 0.4, 44]} />
        <meshStandardMaterial color={PALETTE.stone} roughness={0.92} metalness={0} />
      </mesh>

      {/* ------------------------------------------------------------------ */}
      {/* Basamento: zócalo, lobby vidriado y alero                          */}
      {/* ------------------------------------------------------------------ */}

      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[27, 0.4, 21]} />
        <meshStandardMaterial color={PALETTE.concreteDark} roughness={0.9} metalness={0} />
      </mesh>

      <mesh position={[0, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[24.5, 2.4, 18.5]} />
        <meshStandardMaterial color={PALETTE.glass} roughness={0.15} metalness={0.45} />
      </mesh>

      {/* El alero es la línea horizontal que separa base y torre. */}
      <mesh position={[0, 3.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[28.5, 0.5, 22.5]} />
        <meshStandardMaterial color={PALETTE.slab} roughness={0.75} metalness={0} />
      </mesh>

      {/* ------------------------------------------------------------------ */}
      {/* Torre                                                              */}
      {/* ------------------------------------------------------------------ */}

      <mesh position={[0, towerCenter, 0]} castShadow receiveShadow>
        <boxGeometry args={[13.4, towerHeight, 11.4]} />
        <meshStandardMaterial color={PALETTE.glass} roughness={0.15} metalness={0.45} />
      </mesh>

      {/* Montantes verticales sobre el vidriado: le dan escala y textura.
          No proyectan sombra, son demasiado finos para que se note. */}
      {MULLIONS_X.map((x) =>
        [-5.78, 5.78].map((z) => (
          <mesh key={`${x}:${z}`} position={[x, towerCenter, z]}>
            <boxGeometry args={[0.22, towerHeight, 0.22]} />
            <meshStandardMaterial color={PALETTE.concrete} roughness={0.7} metalness={0.1} />
          </mesh>
        )),
      )}

      {/* Aletas verticales laterales: contrapeso al ritmo de las losas. */}
      {[-7.2, 7.2].map((x) => (
        <mesh key={x} position={[x, towerCenter, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.7, towerHeight, 12]} />
          <meshStandardMaterial color={PALETTE.concrete} roughness={0.85} metalness={0} />
        </mesh>
      ))}

      {/* Losas de entrepiso con su baranda: el ritmo horizontal que lee
          como balcones. Las barandas no proyectan sombra a propósito. */}
      {slabHeights.map((y) => (
        <group key={y}>
          <mesh position={[0, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[TOWER.width, 0.3, TOWER.depth]} />
            <meshStandardMaterial color={PALETTE.slab} roughness={0.7} metalness={0} />
          </mesh>

          {[-6.45, 6.45].map((z) => (
            <mesh key={z} position={[0, y + 0.68, z]}>
              <boxGeometry args={[TOWER.width, 1.05, 0.1]} />
              <meshStandardMaterial color={PALETTE.railing} roughness={0.25} metalness={0.25} />
            </mesh>
          ))}

          {[-7.45, 7.45].map((x) => (
            <mesh key={x} position={[x, y + 0.68, 0]}>
              <boxGeometry args={[0.1, 1.05, TOWER.depth]} />
              <meshStandardMaterial color={PALETTE.railing} roughness={0.25} metalness={0.25} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Remate desplazado del eje: rompe la simetría perfecta, que es lo que
          hace que un volumen se lea como maqueta de juguete. */}
      <mesh position={[2, 41.7, -0.6]} castShadow receiveShadow>
        <boxGeometry args={[9, 8, 7.5]} />
        <meshStandardMaterial color={PALETTE.concrete} roughness={0.88} metalness={0} />
      </mesh>

      <mesh position={[2, 45.9, -0.6]} castShadow receiveShadow>
        <boxGeometry args={[9.8, 0.4, 8.3]} />
        <meshStandardMaterial color={PALETTE.slab} roughness={0.7} metalness={0} />
      </mesh>

      {/* ------------------------------------------------------------------ */}
      {/* Ala baja de amenities                                              */}
      {/* ------------------------------------------------------------------ */}

      <mesh position={[-20.5, 3.4, 3]} castShadow receiveShadow>
        <boxGeometry args={[11, 6, 15]} />
        <meshStandardMaterial color={PALETTE.concreteDark} roughness={0.88} metalness={0} />
      </mesh>

      <mesh position={[-20.5, 6.6, 3]} castShadow receiveShadow>
        <boxGeometry args={[12, 0.4, 16]} />
        <meshStandardMaterial color={PALETTE.slab} roughness={0.75} metalness={0} />
      </mesh>

      {/* Pileta. Agua = rugosidad muy baja, para que devuelva el cielo. */}
      <mesh position={[-20.5, 0.55, -11]} receiveShadow>
        <boxGeometry args={[9, 0.3, 5]} />
        <meshStandardMaterial color={PALETTE.water} roughness={0.06} metalness={0.3} />
      </mesh>
    </group>
  );
}
