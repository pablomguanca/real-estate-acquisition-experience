import { useEffect } from 'react';
import { Html } from '@react-three/drei';

import { UNIT_STATUS } from '../../config/status';
import type { Floor, Unit } from '../../types/floor';
import styles from './hotspot.module.scss';

/**
 * Unidades del piso seleccionado, resaltadas sobre la fachada.
 *
 * Cada una ocupa su cuadrante de la planta. Al estar en 3D y no en un plano
 * 2D, el usuario no cambia de contexto: sigue mirando el mismo edificio y ve
 * dónde está parada la unidad respecto del conjunto.
 *
 * Igual que los pisos, la geometría sale de los datos (footprint) y no del
 * modelo, así que el reemplazo por el GLB real no toca este componente.
 */

interface UnitsProps {
  floor: Floor;
  selectedUnitId: string | null;
  hoveredUnitId: string | null;
  onHoverUnit: (id: string | null) => void;
  onSelectUnit: (id: string) => void;
}

interface UnitVolumeProps {
  unit: Unit;
  floorHeight: number;
  isSelected: boolean;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

function UnitVolume({
  unit,
  floorHeight,
  isSelected,
  isHovered,
  onHover,
  onSelect,
}: UnitVolumeProps) {
  const [offsetX, offsetZ] = unit.footprint.offset;
  const [width, depth] = unit.footprint.size;
  const { color, label } = UNIT_STATUS[unit.status];

  const active = isSelected || isHovered;

  return (
    <group position={[offsetX, 0, offsetZ]}>
      <mesh
        onPointerOver={(event) => {
          event.stopPropagation();
          onHover(unit.id);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(unit.id);
        }}
      >
        <boxGeometry args={[width, floorHeight, depth]} />
        <meshBasicMaterial
          color={color}
          transparent
          // En reposo apenas se insinúan: cuatro bloques opacos taparían la
          // fachada y el piso dejaría de leerse como parte del edificio.
          opacity={active ? 0.62 : 0.3}
          depthWrite={false}
        />
      </mesh>

      {active && (
        <Html center zIndexRange={[100, 0]} pointerEvents="none" position={[0, 0, 0]}>
          <span className={styles.label} data-active>
            {unit.label} · {label}
          </span>
        </Html>
      )}
    </group>
  );
}

export function Units({
  floor,
  selectedUnitId,
  hoveredUnitId,
  onHoverUnit,
  onSelectUnit,
}: UnitsProps) {
  useEffect(() => {
    if (hoveredUnitId === null) return;

    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hoveredUnitId]);

  return (
    <group position={[0, floor.elevation + floor.height / 2, 0]}>
      {floor.units.map((unit) => (
        <UnitVolume
          key={unit.id}
          unit={unit}
          floorHeight={floor.height}
          isSelected={selectedUnitId === unit.id}
          isHovered={hoveredUnitId === unit.id}
          onHover={onHoverUnit}
          onSelect={onSelectUnit}
        />
      ))}
    </group>
  );
}
