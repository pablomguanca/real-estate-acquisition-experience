import { type ChangeEvent, useState } from 'react';

import { resolveMedia } from '../services/media';
import { ACCEPT_ATTRIBUTE, MediaError, removeMedia, uploadMedia } from './uploadMedia';
import styles from './gallery.module.scss';

/**
 * Galería de un espacio o una unidad.
 *
 * Trabaja sobre rutas, no URLs: `resolveMedia` las convierte para mostrarlas,
 * la misma función que usa la experiencia pública. Si mañana se cambia el
 * hosting, cambia el resolvedor y estas miniaturas siguen funcionando.
 *
 * Las subidas se aplican al instante sobre Storage —un archivo ya está
 * cargado, no tiene sentido retenerlo— pero el cambio en la lista viaja hacia
 * arriba como edición pendiente, para que se guarde junto con el resto.
 */

interface GalleryEditorProps {
  /** Carpeta destino, por ejemplo projects/project-01/amenities/pool. */
  folder: string;
  gallery: string[];
  disabled?: boolean;
  onChange: (gallery: string[]) => void;
}

export function GalleryEditor({
  folder,
  gallery,
  disabled,
  onChange,
}: GalleryEditorProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    // Permite volver a elegir el mismo archivo tras un error.
    event.target.value = '';

    if (files.length === 0) return;

    setBusy(true);
    setError(null);

    try {
      const paths: string[] = [];
      for (const file of files) {
        paths.push(await uploadMedia(folder, file));
      }
      onChange([...gallery, ...paths]);
    } catch (cause) {
      setError(
        cause instanceof MediaError
          ? cause.message
          : 'No se pudo subir la imagen. Puede que no tengas permiso sobre este desarrollo.',
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (path: string) => {
    setError(null);

    // Sale de la lista primero: si el borrado del archivo falla, la galería
    // igual queda como la persona la quiere y el huérfano no se muestra.
    onChange(gallery.filter((item) => item !== path));

    try {
      await removeMedia(path);
    } catch {
      setError('La imagen se quitó de la galería, pero no se pudo borrar del bucket.');
    }
  };

  return (
    <div className={styles.gallery}>
      <div className={styles.items}>
        {gallery.map((path) => (
          <figure key={path} className={styles.item}>
            <img src={resolveMedia(path) ?? undefined} alt="" loading="lazy" />
            {!disabled && (
              <button
                type="button"
                className={styles.remove}
                onClick={() => remove(path)}
                aria-label="Quitar imagen"
              >
                ×
              </button>
            )}
          </figure>
        ))}

        {!disabled && (
          <label className={styles.add} data-busy={busy || undefined}>
            <input
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              multiple
              disabled={busy}
              onChange={add}
            />
            {busy ? 'Subiendo…' : '+ Imagen'}
          </label>
        )}
      </div>

      {gallery.length === 0 && !busy && (
        <p className={styles.empty}>
          Sin imágenes. La galería no se muestra en la experiencia hasta que haya al menos
          una.
        </p>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
