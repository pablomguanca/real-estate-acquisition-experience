import { UNIT_STATUS } from '../../config/status';
import type { Floor, Unit } from '../../types/floor';
import { Panel } from './Panel';
import { UnitGallery } from './UnitGallery';
import { UnitPlan } from './UnitPlan';
import styles from './PanelContent.module.scss';

/**
 * Ficha comercial de una unidad.
 *
 * La cáscara (posición, animación, cierre) la pone Panel; acá va el contenido.
 *
 * El orden de lectura está pensado para alguien que está decidiendo: qué es,
 * en qué estado está, cuánto mide, cuánto cuesta, dónde queda. El precio va
 * antes del plano a propósito: es la pregunta que trae a la gente.
 */

interface UnitPanelProps {
  unit: Unit | null;
  floor: Floor | null;
  onClose: () => void;
}

/** Sin decimales: los centavos en un precio de lista son ruido. */
const priceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function UnitPanel({ unit, floor, onClose }: UnitPanelProps) {
  const status = unit ? UNIT_STATUS[unit.status] : null;
  const name = unit && floor ? `Unidad ${floor.label}${unit.label}` : undefined;

  return (
    <Panel open={unit !== null} onClose={onClose} label={name}>
      {unit && floor && status && (
        <>
          <p className={styles.eyebrow}>Unidad</p>

          <div className={styles.titleRow}>
            <h2 className={styles.title}>
              {floor.label}
              {unit.label}
            </h2>
            <span
              className={styles.status}
              // El color sale de la misma constante que pinta el volumen 3D,
              // así la ficha y la fachada nunca se contradicen.
              style={{ '--status-color': status.color } as React.CSSProperties}
            >
              {status.label}
            </span>
          </div>

          <dl className={styles.specs}>
            <div className={styles.spec}>
              <dt>Superficie total</dt>
              <dd>{unit.area} m²</dd>
            </div>
            <div className={styles.spec}>
              <dt>Ambientes</dt>
              <dd>{unit.rooms}</dd>
            </div>
            <div className={styles.spec}>
              <dt>Cubierta</dt>
              <dd>{unit.coveredArea} m²</dd>
            </div>
            <div className={styles.spec}>
              <dt>Balcón</dt>
              <dd>{unit.balconyArea} m²</dd>
            </div>
            <div className={styles.spec}>
              <dt>Baños</dt>
              <dd>{unit.bathrooms}</dd>
            </div>
            <div className={styles.spec}>
              <dt>Orientación</dt>
              <dd>{unit.orientation}</dd>
            </div>
          </dl>

          {unit.price !== null ? (
            <p className={styles.price}>
              <span className={styles.priceValue}>{priceFormatter.format(unit.price)}</span>
              <span className={styles.priceNote}>
                {priceFormatter.format(Math.round(unit.price / unit.area))} por m²
              </span>
            </p>
          ) : (
            // En una unidad vendida el precio no es información útil, pero el
            // hueco sin explicar sí desconcierta.
            <p className={styles.priceAbsent}>Precio no disponible</p>
          )}

          <UnitPlan floor={floor} selectedUnitId={unit.id} />

          <UnitGallery unit={unit} />
        </>
      )}
    </Panel>
  );
}
