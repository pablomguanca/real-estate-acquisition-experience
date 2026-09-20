import { useMemo } from 'react';

import { useProject } from '../../context/ProjectContext';
import { countAvailable, floorsTopDown } from '../../data/queries';
import styles from './FloorList.module.scss';

/**
 * Selector vertical de pisos, de arriba hacia abajo como en un ascensor.
 *
 * Está sincronizado en los dos sentidos con la escena: pasar por encima de un
 * ítem resalta el piso en el edificio, y pasar por encima del edificio resalta
 * el ítem. Esa correspondencia es lo que hace entendible una torre de once
 * plantas iguales.
 */

interface FloorListProps {
  visible: boolean;
  selectedFloorId: string | null;
  hoveredFloorId: string | null;
  onHoverFloor: (id: string | null) => void;
  onSelectFloor: (id: string) => void;
}

export function FloorList({
  visible,
  selectedFloorId,
  hoveredFloorId,
  onHoverFloor,
  onSelectFloor,
}: FloorListProps) {
  const { project } = useProject();
  // Se invierte una vez por render y no en cada ítem: la lista es corta, pero
  // el patrón importa cuando una torre tenga cuarenta pisos.
  const floors = useMemo(() => floorsTopDown(project.floors), [project.floors]);

  return (
    <div
      className={styles.list}
      data-visible={visible || undefined}
      aria-hidden={!visible}
      role="listbox"
      aria-label="Pisos"
    >
      {floors.map((floor) => {
        const available = countAvailable(floor);
        const active = selectedFloorId === floor.id || hoveredFloorId === floor.id;

        return (
          <button
            key={floor.id}
            type="button"
            role="option"
            aria-selected={selectedFloorId === floor.id}
            className={styles.floor}
            data-active={active || undefined}
            tabIndex={visible ? 0 : -1}
            onMouseEnter={() => onHoverFloor(floor.id)}
            onMouseLeave={() => onHoverFloor(null)}
            onFocus={() => onHoverFloor(floor.id)}
            onBlur={() => onHoverFloor(null)}
            onClick={() => onSelectFloor(floor.id)}
          >
            <span className={styles.level}>{floor.label}</span>
            <span className={styles.available} data-none={available === 0 || undefined}>
              {available} disp.
            </span>
          </button>
        );
      })}
    </div>
  );
}
