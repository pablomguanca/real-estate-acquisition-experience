import { resolveMedia } from '../../services/media';
import type { Unit } from '../../types/floor';
import styles from './UnitGallery.module.scss';

/**
 * Galería de la unidad.
 *
 * Devuelve null cuando no hay imágenes, que hoy es siempre: sin fotos reales,
 * mostrar recuadros vacíos o rellenos genéricos abarata la ficha entera. La
 * sección aparece sola el día que los datos traigan rutas.
 *
 * Para activarla: subir los archivos y cargar sus RUTAS en el campo
 * `gallery` de la unidad, por ejemplo 'projects/project-01/units/08b-01.webp'.
 * El resolvedor decide si salen de /public o de Firebase Storage.
 */

interface UnitGalleryProps {
  unit: Unit;
}

export function UnitGallery({ unit }: UnitGalleryProps) {
  if (unit.gallery.length === 0) return null;

  return (
    <div className={styles.gallery}>
      {unit.gallery.map((source, index) => (
        <figure key={source} className={styles.item}>
          <img
            src={resolveMedia(source) ?? undefined}
            alt={`Unidad ${unit.label}, imagen ${index + 1}`}
            className={styles.image}
            loading="lazy"
          />
        </figure>
      ))}
    </div>
  );
}
