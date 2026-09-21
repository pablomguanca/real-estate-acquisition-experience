import { resolveMedia } from '../../services/media';
import styles from './Gallery.module.scss';

/**
 * Tira de imágenes de una ficha.
 *
 * Sirve igual para una unidad que para un espacio común: no sabe qué está
 * mostrando, solo recibe rutas. Por eso recibe un array y un nombre en vez de
 * la entidad entera, que era lo que antes la ataba a Unit.
 *
 * Devuelve null cuando no hay imágenes. Sin fotos reales, mostrar recuadros
 * vacíos o rellenos genéricos abarata la ficha entera: la sección aparece
 * sola el día que los datos traigan rutas.
 *
 * Trabaja sobre RUTAS, nunca URLs —'projects/project-01/amenities/pool/x.webp'—
 * y el resolvedor decide si salen de /public o de Firebase Storage. Es la
 * misma función que usa el panel para sus miniaturas, así que lo que el
 * cliente sube es literalmente lo que el visitante ve.
 */

interface GalleryProps {
  images: string[];
  /** Para el texto alternativo: "Piscina, imagen 2". */
  name: string;
}

export function Gallery({ images, name }: GalleryProps) {
  if (images.length === 0) return null;

  return (
    <div className={styles.gallery}>
      {images.map((source, index) => (
        <figure key={source} className={styles.item}>
          <img
            src={resolveMedia(source) ?? undefined}
            alt={`${name}, imagen ${index + 1}`}
            className={styles.image}
            loading="lazy"
          />
        </figure>
      ))}
    </div>
  );
}
