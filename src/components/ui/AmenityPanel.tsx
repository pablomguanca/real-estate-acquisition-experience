import type { Amenity } from '../../types/amenity';
import { Gallery } from './Gallery';
import { Panel } from './Panel';
import styles from './PanelContent.module.scss';

/**
 * Contenido del panel para un amenity.
 *
 * La cáscara (posición, animación, cierre) la pone Panel; acá solo va lo que
 * distingue a un amenity de una unidad.
 */

interface AmenityPanelProps {
  amenity: Amenity | null;
  onClose: () => void;
}

export function AmenityPanel({ amenity, onClose }: AmenityPanelProps) {
  return (
    <Panel open={amenity !== null} onClose={onClose} label={amenity?.name}>
      {amenity && (
        <>
          <p className={styles.eyebrow}>Amenity</p>
          <h2 className={styles.title}>{amenity.name}</h2>
          <p className={styles.description}>{amenity.description}</p>

          <Gallery images={amenity.gallery} name={amenity.name} />
        </>
      )}
    </Panel>
  );
}
