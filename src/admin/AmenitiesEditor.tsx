import { useState } from 'react';

import { GalleryEditor } from './GalleryEditor';
import { type AmenityEdit, type AmenityRow, useAmenities } from './useAmenities';
import styles from './units.module.scss';

/**
 * Editor de espacios comunes.
 *
 * Son pocos y muy visuales, así que van como fichas y no como tabla: caben
 * enteros en pantalla y la galería —que es lo que más se edita acá— tiene
 * lugar para verse.
 *
 * Mismo criterio que la lista de precios: nada se guarda hasta apretar
 * guardar, y las fichas tocadas quedan resaltadas.
 */

interface AmenitiesEditorProps {
  slug: string;
  uid: string;
  canEdit: boolean;
}

export function AmenitiesEditor({ slug, uid, canEdit }: AmenitiesEditorProps) {
  const { status, rows, message, save } = useAmenities(slug);

  const [edits, setEdits] = useState<Record<string, AmenityEdit>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirtyCount = Object.keys(edits).length;

  const setEdit = (row: AmenityRow, patch: AmenityEdit) => {
    setEdits((previous) => {
      const merged = { ...previous[row.id], ...patch };

      const unchanged =
        (merged.name === undefined || merged.name === row.name) &&
        (merged.description === undefined || merged.description === row.description) &&
        (merged.gallery === undefined ||
          JSON.stringify(merged.gallery) === JSON.stringify(row.gallery));

      const next = { ...previous, [row.id]: merged };
      if (unchanged) delete next[row.id];

      return next;
    });
  };

  const commit = async () => {
    setSaving(true);
    setError(null);

    try {
      await save(edits, uid);
      setEdits({});
    } catch (cause) {
      setError(
        cause instanceof Error && /permission/i.test(cause.message)
          ? 'El servidor rechazó los cambios. Revisá que el nombre no esté vacío y que tengas permiso sobre este desarrollo.'
          : 'No se pudieron guardar los cambios.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') return <p className={styles.note}>Cargando espacios…</p>;

  if (status === 'error') {
    return <p className={styles.error}>No se pudieron cargar los espacios. {message}</p>;
  }

  if (rows.length === 0) {
    return (
      <p className={styles.note}>
        Este desarrollo todavía no tiene espacios cargados en Firestore. Corré{' '}
        <code>npm run seed -- {slug}</code>.
      </p>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <p className={styles.note}>
          El nombre, la descripción y las imágenes son editables. La ubicación de cada
          espacio en la escena 3D no: es calibración y vive en el archivo del desarrollo.
        </p>

        {canEdit && (
          <button
            type="button"
            className={styles.primary}
            onClick={commit}
            disabled={dirtyCount === 0 || saving}
          >
            {saving
              ? 'Guardando…'
              : dirtyCount === 0
                ? 'Sin cambios'
                : `Guardar ${dirtyCount}`}
          </button>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.cards}>
        {rows.map((row) => {
          const edit = edits[row.id];
          const name = edit?.name ?? row.name;
          const description = edit?.description ?? row.description;
          const gallery = edit?.gallery ?? row.gallery;

          return (
            <article key={row.id} className={styles.card} data-dirty={edit ? true : undefined}>
              <label className={styles.cardField}>
                <span>Nombre</span>
                <input
                  type="text"
                  value={name}
                  maxLength={80}
                  disabled={!canEdit}
                  onChange={(event) => setEdit(row, { name: event.target.value })}
                />
              </label>

              <label className={styles.cardField}>
                <span>Descripción</span>
                <textarea
                  value={description}
                  maxLength={600}
                  rows={3}
                  disabled={!canEdit}
                  onChange={(event) => setEdit(row, { description: event.target.value })}
                />
                <small>{description.length}/600</small>
              </label>

              <GalleryEditor
                folder={`projects/${slug}/amenities/${row.id}`}
                gallery={gallery}
                disabled={!canEdit}
                onChange={(next) => setEdit(row, { gallery: next })}
              />
            </article>
          );
        })}
      </div>
    </div>
  );
}
