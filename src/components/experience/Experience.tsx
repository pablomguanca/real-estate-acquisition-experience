import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';

import { CalibrationProbe } from '../../calibration/CalibrationProbe';
import { ProjectBridge, useProject } from '../../context/ProjectContext';
import type { Floor } from '../../types/floor';
import type { CameraView } from '../../types/scene';
import { Atmosphere } from './Atmosphere';
import { Building } from './Building';
import { CameraRig } from './CameraRig';
import { Context } from './Context';
import { Floors } from './Floors';
import { Hotspots } from './Hotspots';
import { IntroFlight } from './IntroFlight';
import { SceneLights } from './SceneLights';
import { Terrain } from './Terrain';
import { Units } from './Units';

/**
 * Raíz de la escena 3D.
 *
 * Todo lo que está dentro de <Canvas> vive en el reconciliador de React Three
 * Fiber y produce objetos de Three.js. La interfaz en DOM se monta como
 * hermana de este componente, nunca adentro: así abrir un panel no vuelve a
 * renderizar el árbol 3D.
 */

interface ExperienceProps {
  /** Verdadero una vez que el usuario pasó el overlay de entrada. */
  hasEntered: boolean;
  /** Verdadero cuando el vuelo de apertura terminó o fue interrumpido. */
  introDone: boolean;
  onIntroComplete: () => void;
  view: CameraView;
  mode: 'overview' | 'floors';
  selectedAmenityId: string | null;
  onSelectAmenity: (id: string) => void;
  selectedFloorId: string | null;
  hoveredFloorId: string | null;
  onHoverFloor: (id: string | null) => void;
  onSelectFloor: (id: string) => void;
  /** El piso abierto, ya resuelto por App. Null si no hay ninguno. */
  openFloor: Floor | null;
  selectedUnitId: string | null;
  hoveredUnitId: string | null;
  onHoverUnit: (id: string | null) => void;
  onSelectUnit: (id: string) => void;
}

export function Experience({
  hasEntered,
  introDone,
  onIntroComplete,
  view,
  mode,
  selectedAmenityId,
  onSelectAmenity,
  selectedFloorId,
  hoveredFloorId,
  onHoverFloor,
  onSelectFloor,
  openFloor,
  selectedUnitId,
  hoveredUnitId,
  onHoverUnit,
  onSelectUnit,
}: ExperienceProps) {
  // Experience se ejecuta del lado de afuera del Canvas, así que acá el
  // contexto sí está disponible. Lo que sigue dentro del Canvas lo recibe
  // por el puente.
  const projectValue = useProject();
  const { scene } = projectValue;

  return (
    <Canvas
      // 'percentage' = PCFShadowMap. El default de R3F es PCFSoftShadowMap,
      // que three deprecó en r186 y emite un warning en cada arranque.
      shadows="percentage"
      // Techo de 2x en pantallas retina: por encima de eso el costo de
      // rasterizado no se traduce en calidad percibida.
      dpr={[1, 2]}
      gl={{
        antialias: true,
        toneMappingExposure: scene.render.toneMappingExposure,
      }}
    >
      <ProjectBridge value={projectValue}>
      <Atmosphere />

      {/* El rig cede el mando mientras corre el vuelo de apertura. */}
      <CameraRig view={view} enabled={introDone} />

      {hasEntered && !introDone && <IntroFlight onComplete={onIntroComplete} />}

      <SceneLights />

      <Terrain />
      <Context />

      {/* El fallback es null a propósito: el IntroOverlay es el que cubre la
          carga, no un spinner dentro de la escena. */}
      <Suspense fallback={null}>
        <Building />
      </Suspense>

      {/* Los hotspots aparecen recién cuando la cámara se detuvo: verlos
          desfilar durante el vuelo arruina la apertura. En modo pisos se
          retiran, porque competirían por el click con los entrepisos. */}
      {introDone && mode === 'overview' && (
        <Hotspots selectedId={selectedAmenityId} onSelect={onSelectAmenity} />
      )}

      {introDone && (
        <Floors
          mode={mode}
          selectedFloorId={selectedFloorId}
          hoveredFloorId={hoveredFloorId}
          onHoverFloor={onHoverFloor}
          onSelectFloor={onSelectFloor}
        />
      )}

      {openFloor && (
        <Units
          floor={openFloor}
          selectedUnitId={selectedUnitId}
          hoveredUnitId={hoveredUnitId}
          onHoverUnit={onHoverUnit}
          onSelectUnit={onSelectUnit}
        />
      )}
      {/* Solo hace algo si la capa de calibración está montada. */}
      <CalibrationProbe />
      </ProjectBridge>
    </Canvas>
  );
}
