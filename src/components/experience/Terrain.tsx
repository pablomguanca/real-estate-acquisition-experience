import { useMemo } from 'react';
import { BufferAttribute, Color, PlaneGeometry } from 'three';

import { terrainHeight } from '../../config/terrain';
import { useProject } from '../../context/ProjectContext';

/**
 * El sitio donde se apoya el proyecto.
 *
 * Vive separado del edificio a propósito: cuando el placeholder se reemplace
 * por el GLB real, el terreno se queda. Antes estaba adentro de
 * PlaceholderBuilding y borrar ese archivo se habría llevado el suelo puesto.
 *
 * El relieve resuelve el problema visual de fondo que tenía la escena: un
 * plano perfectamente liso corta el cielo en una línea recta que delata la
 * escena como maqueta. Con ondulación, la silueta del horizonte se quiebra y
 * la niebla puede disolverla.
 */

/**
 * El terreno se tiñe por altura: las partes bajas más frías y oscuras, las
 * altas más cálidas, como si les diera el sol rasante. Sin esto el relieve
 * existe pero se lee como una sola masa plana de un único valor.
 */
const GROUND_LOW = new Color('#24231f');
const GROUND_HIGH = new Color('#3d372c');

export function Terrain() {
  const { scene } = useProject();
  const terrain = scene.terrain;

  // La geometría se construye una sola vez por desarrollo: veinte mil
  // vértices desplazados en cada render serían un desperdicio, y el relieve
  // no cambia mientras el proyecto sea el mismo.
  const geometry = useMemo(() => {
    const plane = new PlaneGeometry(
      terrain.size,
      terrain.size,
      terrain.segments,
      terrain.segments,
    );

    const position = plane.attributes.position!;
    const colors = new Float32Array(position.count * 3);
    const color = new Color();

    const halfAmplitude = terrain.amplitude / 2;

    // El plano nace vertical y se rota al horizontal más abajo, así que en
    // espacio local el eje Z del mundo es Y, y la altura va sobre Z.
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const y = position.getY(i);
      const height = terrainHeight(x, -y, terrain);

      position.setZ(i, height);

      // De -amplitud/2..+amplitud/2 a 0..1.
      const t = Math.min(Math.max(height / halfAmplitude, -1), 1) * 0.5 + 0.5;
      color.copy(GROUND_LOW).lerp(GROUND_HIGH, t);

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    position.needsUpdate = true;
    plane.setAttribute('color', new BufferAttribute(colors, 3));
    // Sin esto las normales siguen apuntando todas hacia arriba y el relieve
    // no recibe luz: se vería plano aunque la geometría no lo sea.
    plane.computeVertexNormals();

    return plane;
  }, [terrain]);

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} />
    </mesh>
  );
}
