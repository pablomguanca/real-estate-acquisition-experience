import { useMemo } from 'react';

import { UNIT_STATUS } from '../../config/status';
import type { Floor } from '../../types/floor';
import styles from './UnitPlan.module.scss';

/**
 * Planta esquemática del piso, con la unidad seleccionada resaltada.
 *
 * Se dibuja a partir de los mismos footprint que generan los volúmenes en la
 * escena. Eso tiene dos consecuencias buenas: no hace falta ningún archivo de
 * plano, y el dibujo no puede contradecir al edificio. Si mañana la planta
 * cambia, cambian los dos a la vez.
 *
 * No pretende ser un plano de arquitectura: es un esquema de ubicación, que
 * es lo que alguien necesita para entender dónde está parada la unidad.
 */

interface UnitPlanProps {
  floor: Floor;
  selectedUnitId: string;
}

/** Margen alrededor del dibujo, en las mismas unidades que la planta. */
const PADDING = 2.2;

export function UnitPlan({ floor, selectedUnitId }: UnitPlanProps) {
  const layout = useMemo(() => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (const unit of floor.units) {
      const [offsetX, offsetZ] = unit.footprint.offset;
      const [width, depth] = unit.footprint.size;

      minX = Math.min(minX, offsetX - width / 2);
      maxX = Math.max(maxX, offsetX + width / 2);
      minZ = Math.min(minZ, offsetZ - depth / 2);
      maxZ = Math.max(maxZ, offsetZ + depth / 2);
    }

    return {
      minX: minX - PADDING,
      minZ: minZ - PADDING,
      width: maxX - minX + PADDING * 2,
      height: maxZ - minZ + PADDING * 2,
    };
  }, [floor]);

  return (
    <figure className={styles.plan}>
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className={styles.canvas}
        role="img"
        aria-label={`Planta del piso ${floor.label}`}
      >
        {floor.units.map((unit) => {
          const [offsetX, offsetZ] = unit.footprint.offset;
          const [width, depth] = unit.footprint.size;
          const isSelected = unit.id === selectedUnitId;

          // El eje Z del mundo apunta al frente, que tomamos como norte. En un
          // plano el norte va arriba, así que se invierte para la pantalla.
          const x = offsetX - width / 2 - layout.minX;
          const y = layout.height - (offsetZ + depth / 2 - layout.minZ);

          return (
            <g key={unit.id}>
              <rect
                x={x}
                y={y}
                width={width}
                height={depth}
                className={styles.unit}
                data-selected={isSelected || undefined}
                style={{ '--unit-color': UNIT_STATUS[unit.status].color } as React.CSSProperties}
              />
              <text
                x={x + width / 2}
                y={y + depth / 2}
                className={styles.letter}
                data-selected={isSelected || undefined}
              >
                {unit.label}
              </text>
            </g>
          );
        })}

        {/* Norte. Sin referencia de orientación un esquema de planta no sirve
            para ubicarse, y una línea suelta con una letra se lee como ruido:
            una punta de flecha lo vuelve inequívoco. */}
        <g className={styles.compass}>
          <path
            d={`M ${layout.width - 1.4} 1.5 L ${layout.width - 1.9} 2.6 L ${
              layout.width - 1.4
            } 2.25 L ${layout.width - 0.9} 2.6 Z`}
          />
          <text x={layout.width - 1.4} y={0.8} className={styles.north}>
            N
          </text>
        </g>
      </svg>

      <figcaption className={styles.caption}>Planta piso {floor.label}</figcaption>
    </figure>
  );
}
