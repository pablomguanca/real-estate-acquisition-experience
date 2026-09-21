import { Fragment, useMemo, useState } from 'react';

import type { UnitStatus } from '../types/floor';
import { UNIT_STATUS } from '../config/status';
import { GalleryEditor } from './GalleryEditor';
import type { Author } from './history';
import { type PasteResult, parsePaste } from './parsePaste';
import { type UnitEdit, type UnitRow, unitCode, useUnits } from './useUnits';
import styles from './units.module.scss';

/**
 * Lista de precios editable.
 *
 * Dos decisiones gobiernan el diseño:
 *
 *  1. Edición en línea, no un formulario por unidad. Nadie abre cuarenta
 *     modales para cambiar cuarenta precios.
 *  2. Nada se guarda hasta que se aprieta guardar. Las ediciones se acumulan y
 *     se ven resaltadas, para poder revisarlas antes de publicar. Un panel que
 *     escribe en cada tecleo publica errores de tipeo.
 */

const STATUSES: UnitStatus[] = ['disponible', 'reservado', 'vendido'];

const priceFormatter = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 0,
});

interface UnitsTableProps {
  slug: string;
  author: Author;
  canEdit: boolean;
}

export function UnitsTable({ slug, author, canEdit }: UnitsTableProps) {
  const { status, rows, message, save } = useUnits(slug);

  const [edits, setEdits] = useState<Record<string, UnitEdit>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteResult, setPasteResult] = useState<PasteResult | null>(null);
  // Qué unidad tiene la galería desplegada. Una por vez: abrir varias llena la
  // tabla de miniaturas y se pierde la lista de precios, que es lo principal.
  const [expanded, setExpanded] = useState<string | null>(null);

  const dirtyCount = Object.keys(edits).length;

  const summary = useMemo(() => {
    const counts: Record<UnitStatus, number> = {
      disponible: 0,
      reservado: 0,
      vendido: 0,
    };

    for (const row of rows) {
      counts[edits[row.id]?.status ?? row.status] += 1;
    }

    return counts;
  }, [rows, edits]);

  const setEdit = (row: UnitRow, patch: UnitEdit) => {
    setEdits((previous) => {
      const next = { ...previous, [row.id]: { ...previous[row.id], ...patch } };

      // Si la fila volvió a su valor original, deja de ser una edición: el
      // contador tiene que reflejar cambios reales, no celdas tocadas.
      const merged = next[row.id]!;
      const unchanged =
        (merged.status === undefined || merged.status === row.status) &&
        (merged.price === undefined || merged.price === row.price) &&
        (merged.gallery === undefined ||
          JSON.stringify(merged.gallery) === JSON.stringify(row.gallery));

      if (unchanged) delete next[row.id];

      return next;
    });
  };

  const applyPaste = () => {
    const result = parsePaste(pasteText, rows);
    setPasteResult(result);
    setEdits((previous) => ({ ...previous, ...result.edits }));
  };

  const commit = async () => {
    setSaving(true);
    setError(null);

    try {
      await save(edits, author);
      setEdits({});
      setPasteResult(null);
      setPasteText('');
      setPasteOpen(false);
    } catch (cause) {
      // Las reglas rechazan del lado del servidor: si el panel muestra algo
      // que el servidor no permite, el usuario tiene que enterarse acá y no
      // creer que guardó.
      setError(
        cause instanceof Error && /permission/i.test(cause.message)
          ? 'El servidor rechazó los cambios. Puede que no tengas permiso sobre este desarrollo.'
          : 'No se pudieron guardar los cambios.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') return <p className={styles.note}>Cargando unidades…</p>;

  if (status === 'error') {
    return <p className={styles.error}>No se pudieron cargar las unidades. {message}</p>;
  }

  if (rows.length === 0) {
    return (
      <p className={styles.note}>
        Este desarrollo todavía no tiene unidades cargadas en Firestore. Corré{' '}
        <code>npm run seed -- {slug}</code> para subirlas desde el archivo del proyecto.
      </p>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.counts}>
          {STATUSES.map((value) => (
            <span key={value} className={styles.count}>
              <i style={{ background: UNIT_STATUS[value].color }} />
              {UNIT_STATUS[value].label}: <b>{summary[value]}</b>
            </span>
          ))}
        </div>

        <div className={styles.toolbarActions}>
          {canEdit && (
            <button
              type="button"
              className={styles.ghost}
              onClick={() => setPasteOpen((open) => !open)}
            >
              {pasteOpen ? 'Cerrar importación' : 'Importar de planilla'}
            </button>
          )}

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
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {pasteOpen && (
        <div className={styles.paste}>
          <p className={styles.note}>
            Pegá columnas de tu planilla en el orden <b>unidad · estado · precio</b>. El
            estado y el precio son opcionales. Los cambios quedan pendientes para que los
            revises antes de guardar.
          </p>

          <textarea
            className={styles.textarea}
            value={pasteText}
            onChange={(event) => setPasteText(event.target.value)}
            placeholder={'08C\tvendido\n01B\t\tUS$ 250.000'}
            rows={5}
          />

          <div className={styles.toolbarActions}>
            <button type="button" className={styles.ghost} onClick={applyPaste}>
              Previsualizar
            </button>
          </div>

          {pasteResult && (
            <p className={styles.note}>
              {pasteResult.matched}{' '}
              {pasteResult.matched === 1 ? 'cambio pendiente' : 'cambios pendientes'}.
              {pasteResult.unknown.length > 0 && (
                <>
                  {' '}
                  Sin coincidencia: <b>{pasteResult.unknown.join(', ')}</b>.
                </>
              )}
              {pasteResult.invalid.length > 0 && (
                <> {pasteResult.invalid.length} línea(s) no se pudieron interpretar.</>
              )}
            </p>
          )}
        </div>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Unidad</th>
            <th>Piso</th>
            <th>Estado</th>
            <th>Precio</th>
            <th>Imágenes</th>
            <th>Última edición</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const edit = edits[row.id];
            const status = edit?.status ?? row.status;
            const price = edit?.price !== undefined ? edit.price : row.price;
            const gallery = edit?.gallery ?? row.gallery;
            const isOpen = expanded === row.id;

            return (
              <Fragment key={row.id}>
              <tr data-dirty={edit ? true : undefined}>
                <td className={styles.code}>{unitCode(row)}</td>
                <td>{row.floorId.replace(/^floor-/, '')}</td>

                <td>
                  <select
                    className={styles.select}
                    value={status}
                    disabled={!canEdit}
                    style={{ color: UNIT_STATUS[status].color }}
                    onChange={(event) =>
                      setEdit(row, { status: event.target.value as UnitStatus })
                    }
                  >
                    {STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {UNIT_STATUS[value].label}
                      </option>
                    ))}
                  </select>
                </td>

                <td>
                  <input
                    className={styles.price}
                    type="text"
                    inputMode="numeric"
                    disabled={!canEdit}
                    value={price === null ? '' : priceFormatter.format(price)}
                    placeholder="sin precio"
                    onChange={(event) => {
                      const digits = event.target.value.replace(/\D/g, '');
                      setEdit(row, { price: digits === '' ? null : Number(digits) });
                    }}
                  />
                </td>

                <td>
                  <button
                    type="button"
                    className={styles.expand}
                    data-open={isOpen || undefined}
                    onClick={() => setExpanded(isOpen ? null : row.id)}
                  >
                    {gallery.length} {gallery.length === 1 ? 'imagen' : 'imágenes'}
                  </button>
                </td>

                <td className={styles.meta}>
                  {row.updatedAt ? (
                    <>
                      {new Date(row.updatedAt).toLocaleDateString('es-AR')}
                      {row.updatedBy && <span> · {row.updatedBy}</span>}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>

              {isOpen && (
                <tr className={styles.galleryRow}>
                  <td colSpan={6}>
                    <GalleryEditor
                      folder={`projects/${slug}/units/${row.id}`}
                      gallery={gallery}
                      disabled={!canEdit}
                      onChange={(next) => setEdit(row, { gallery: next })}
                    />
                  </td>
                </tr>
              )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
