import { useMemo } from 'react';
import { Instance, Instances } from '@react-three/drei';

import { terrainHeight } from '../../config/terrain';
import { useProject } from '../../context/ProjectContext';
import type { ResolvedScene, Vec3 } from '../../types/scene';

/**
 * Entorno construido y vegetación alrededor del lote.
 *
 * No es decoración: es lo que le da escala al proyecto. Una torre sola sobre
 * un plano vacío no tiene con qué compararse y se lee como maqueta; rodeada de
 * construcción baja, se lee como un edificio de veinte pisos.
 *
 * Todo va instanciado. Son más de cien objetos y como mallas sueltas serían
 * más de cien draw calls; instanciados son cuatro.
 */

/** Ángulo áureo: reparte los puntos sin que se alineen en rayos. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const PALETTE = {
  neighbour: '#464036',
  neighbourRoof: '#56503f',
  canopy: '#2b332a',
  trunk: '#241f19',
};

/** Pseudoaleatorio determinista: el mismo índice da siempre el mismo valor. */
function rand(seed: number): number {
  const n = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return n - Math.floor(n);
}

interface Placement {
  position: Vec3;
  scale: Vec3;
  rotationY: number;
}

function useNeighbours(scene: ResolvedScene): Placement[] {
  return useMemo(() => {
    const { terrain, controls, context } = scene;
    const items: Placement[] = [];

    for (let i = 0; i < context.neighbourCount; i += 1) {
      const angle = i * GOLDEN_ANGLE + rand(i) * 0.6;
      const radius = 72 + rand(i + 100) * 190;

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const width = 9 + rand(i + 200) * 14;
      const depth = 9 + rand(i + 300) * 13;

      /**
       * La altura permitida crece con la distancia.
       *
       * El umbral es controls.maxDistance y no un número suelto: mientras la
       * cámara pueda llegar hasta ahí, cualquier volumen alto en ese anillo se
       * mete entre el espectador y el proyecto. Dentro de la órbita va
       * construcción baja; el skyline empieza donde la cámara ya no llega.
       */
      const beyondOrbit = radius - controls.maxDistance;
      const distanceFactor = Math.min(Math.max(beyondOrbit / 90, 0), 1);
      const height = 4 + rand(i + 400) * (7 + distanceFactor * 26);

      items.push({
        // Se hunden un poco: en terreno con pendiente, una caja apoyada justo
        // en la altura del centro deja esquinas al aire.
        position: [x, terrainHeight(x, z, terrain) - 1.6 + height / 2, z],
        scale: [width, height, depth],
        rotationY: rand(i + 500) * Math.PI,
      });
    }

    return items;
  }, [scene]);
}

function useTrees(scene: ResolvedScene): Placement[] {
  return useMemo(() => {
    const { terrain, context } = scene;
    const items: Placement[] = [];

    for (let i = 0; i < context.treeCount; i += 1) {
      const angle = i * GOLDEN_ANGLE + rand(i + 700) * 0.9;
      const radius = 40 + rand(i + 800) * 170;

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const spread = 1.7 + rand(i + 900) * 1.5;
      const tall = 2.4 + rand(i + 1000) * 2.2;

      items.push({
        position: [x, terrainHeight(x, z, terrain), z],
        scale: [spread, tall, spread],
        rotationY: rand(i + 1100) * Math.PI,
      });
    }

    return items;
  }, [scene]);
}

export function Context() {
  const { scene } = useProject();
  const neighbours = useNeighbours(scene);
  const trees = useTrees(scene);

  return (
    <group>
      {/* Cuerpos de los edificios vecinos */}
      <Instances limit={neighbours.length} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={PALETTE.neighbour} roughness={0.95} metalness={0} />
        {neighbours.map((item, index) => (
          <Instance
            key={index}
            position={item.position}
            scale={item.scale}
            rotation={[0, item.rotationY, 0]}
          />
        ))}
      </Instances>

      {/* Losa de remate: una línea clara arriba los vuelve legibles como
          edificios y no como bloques. */}
      <Instances limit={neighbours.length} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={PALETTE.neighbourRoof}
          roughness={0.9}
          metalness={0}
        />
        {neighbours.map((item, index) => (
          <Instance
            key={index}
            position={[
              item.position[0],
              item.position[1] + item.scale[1] / 2,
              item.position[2],
            ]}
            scale={[item.scale[0] * 1.06, 0.5, item.scale[2] * 1.06]}
            rotation={[0, item.rotationY, 0]}
          />
        ))}
      </Instances>

      {/* Troncos */}
      <Instances limit={trees.length} castShadow>
        <cylinderGeometry args={[0.16, 0.22, 1, 5]} />
        <meshStandardMaterial color={PALETTE.trunk} roughness={1} metalness={0} />
        {trees.map((item, index) => (
          <Instance
            key={index}
            position={[
              item.position[0],
              item.position[1] + item.scale[1] / 2,
              item.position[2],
            ]}
            scale={[1, item.scale[1], 1]}
          />
        ))}
      </Instances>

      {/* Copas. Una subdivisión: sin subdividir el poliedro se nota apenas la
          cámara se acerca. Ochenta triángulos por copa sigue siendo nada. */}
      <Instances limit={trees.length} castShadow receiveShadow>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={PALETTE.canopy} roughness={0.95} metalness={0} />
        {trees.map((item, index) => (
          <Instance
            key={index}
            position={[
              item.position[0],
              item.position[1] + item.scale[1] + item.scale[0] * 0.55,
              item.position[2],
            ]}
            scale={[item.scale[0], item.scale[0] * 1.15, item.scale[0]]}
            rotation={[0, item.rotationY, 0]}
          />
        ))}
      </Instances>
    </group>
  );
}
