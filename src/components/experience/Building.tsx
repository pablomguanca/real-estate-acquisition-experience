import { useGLTF } from '@react-three/drei';

import { useProject } from '../../context/ProjectContext';
import { resolveMedia } from '../../services/media';
import type { ModelSettings } from '../../types/scene';
import { PlaceholderBuilding } from './PlaceholderBuilding';

/**
 * Punto único de decisión sobre qué se renderiza como edificio.
 *
 * Para pasar al modelo real, el desarrollo declara en su documento:
 *   model: { source: 'gltf', path: 'projects/<slug>/building.glb', ... }
 *
 * Ya no hay nada que editar en el código. Ningún otro componente se entera.
 */

function BuildingModel({ url, model }: { url: string; model: ModelSettings }) {
  const { scene } = useGLTF(url);

  return (
    <primitive
      object={scene}
      position={model.position}
      scale={model.scale}
      rotation={[0, model.rotationY, 0]}
    />
  );
}

export function Building() {
  const { scene } = useProject();
  const { model } = scene;

  // El dato guarda una ruta; el resolvedor decide si sale de /public o de
  // Storage. Sin ruta resoluble, el placeholder: preferimos una maqueta a un
  // agujero en la escena si el modelo no está cargado todavía.
  const url = model.source === 'gltf' ? resolveMedia(model.path) : null;

  if (url) return <BuildingModel url={url} model={model} />;

  return <PlaceholderBuilding />;
}
