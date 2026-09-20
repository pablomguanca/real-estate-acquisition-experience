import { useEffect } from 'react';

import { useProject } from '../../context/ProjectContext';
import type { Floor } from '../../types/floor';

/**
 * Volúmenes de selección de piso, superpuestos a la torre.
 *
 * Son cajas invisibles construidas a partir de la altura de cada losa, no de
 * la geometría del edificio. Eso es lo que hace que toda la interacción de
 * pisos sobreviva al reemplazo del placeholder por el GLB real: se recalibran
 * las alturas en data/floors.ts y nada más.
 *
 * En vista general funcionan como puerta de entrada: tocar la torre en
 * cualquier punto abre el modo pisos y selecciona el que se tocó.
 */

interface FloorsProps {
  /** En 'overview' solo se resalta al pasar por encima; en 'floors' hay selección. */
  mode: 'overview' | 'floors';
  selectedFloorId: string | null;
  hoveredFloorId: string | null;
  onHoverFloor: (id: string | null) => void;
  onSelectFloor: (id: string) => void;
}

/** Algo más anchas que la torre, para que el resaltado sobresalga y se lea. */
const VOLUME_WIDTH = 15.6;
const VOLUME_DEPTH = 13.6;

const ACCENT = '#c9a227';

interface FloorVolumeProps {
  floor: Floor;
  isActive: boolean;
  /** Falso en el piso abierto: ahí el pickeo lo toman sus unidades. */
  interactive: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

function FloorVolume({
  floor,
  isActive,
  interactive,
  onHover,
  onSelect,
}: FloorVolumeProps) {
  const y = floor.elevation + floor.height / 2;

  return (
    <group position={[0, y, 0]}>
      {/* Caja de pickeo. Invisible pero raycasteable: la opacidad no
          interviene en el raycast. Se desmonta en el piso abierto para no
          robarle el click a las unidades, que están adentro de este volumen. */}
      {interactive && (
        <mesh
          onPointerOver={(event) => {
            event.stopPropagation();
            onHover(floor.id);
          }}
          onPointerOut={() => onHover(null)}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(floor.id);
          }}
        >
          <boxGeometry args={[VOLUME_WIDTH, floor.height, VOLUME_DEPTH]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {/* Resaltado. Se monta solo cuando hace falta: once cajas translúcidas
          permanentes obligarían a ordenar transparencias en cada frame. */}
      {isActive && (
        <mesh>
          <boxGeometry args={[VOLUME_WIDTH, floor.height, VOLUME_DEPTH]} />
          <meshBasicMaterial
            color={ACCENT}
            transparent
            opacity={0.26}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

export function Floors({
  mode,
  selectedFloorId,
  hoveredFloorId,
  onHoverFloor,
  onSelectFloor,
}: FloorsProps) {
  const { project } = useProject();

  // El cursor se restituye en la limpieza: si el componente se desmonta con
  // el puntero encima, quedaría en 'pointer' para siempre.
  useEffect(() => {
    if (hoveredFloorId === null) return;

    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hoveredFloorId]);

  return (
    <group>
      {project.floors.map((floor) => {
        const isOpen = mode === 'floors' && selectedFloorId === floor.id;

        return (
          <FloorVolume
            key={floor.id}
            floor={floor}
            // El piso abierto no se resalta: sus unidades ya lo pintan, y
            // superponer las dos capas ensucia el color.
            isActive={hoveredFloorId === floor.id && !isOpen}
            interactive={!isOpen}
            onHover={onHoverFloor}
            onSelect={onSelectFloor}
          />
        );
      })}
    </group>
  );
}
