import type { HistoryEntry, HistoryField } from './history';
import { useHistory } from './useHistory';
import styles from './units.module.scss';
import own from './history.module.scss';

/**
 * Historial de cambios de un desarrollo.
 *
 * Una línea por hecho: qué se tocó, qué decía antes, qué dice ahora, quién y
 * cuándo. Es lo que convierte "el precio estaba mal publicado" en una
 * conversación con fechas en vez de una discusión de memorias.
 *
 * Solo lectura, sin filtros ni exportación. Agregar eso antes de que alguien
 * lo necesite es adivinar; lo que no se puede agregar después es el registro
 * en sí, y eso ya está.
 */

const FIELD_LABEL: Record<HistoryField, string> = {
  status: 'Estado',
  price: 'Precio',
  gallery: 'Imágenes',
  name: 'Nombre',
  description: 'Descripción',
};

const priceFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * El historial guarda el valor como texto crudo; el formato se decide al
 * mostrarlo. Así una anotación vieja se sigue leyendo bien aunque hoy
 * mostremos los precios de otra manera.
 */
function show(field: HistoryField, value: string): string {
  if (field !== 'price' || value === '—') return value;

  const amount = Number(value);
  return Number.isFinite(amount) ? `US$ ${priceFormatter.format(amount)}` : value;
}

function when(at: string): string {
  const date = new Date(at);
  return Number.isNaN(date.getTime()) ? at : dateFormatter.format(date);
}

interface HistoryViewProps {
  slug: string;
}

export function HistoryView({ slug }: HistoryViewProps) {
  const { status, entries, truncated, message } = useHistory(slug);

  if (status === 'loading') return <p className={styles.note}>Cargando historial…</p>;

  if (status === 'error') {
    return <p className={styles.error}>No se pudo leer el historial. {message}</p>;
  }

  if (entries.length === 0) {
    return (
      <p className={styles.note}>
        Todavía no hay cambios registrados. Cada precio, estado, texto o imagen que se
        guarde desde el panel queda anotado acá.
      </p>
    );
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.note}>
        Lo anotado no se puede editar ni borrar, tampoco desde una cuenta de
        administrador. {truncated && 'Se muestran los últimos 200 cambios.'}
      </p>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Cuándo</th>
            <th>Qué</th>
            <th>Campo</th>
            <th>Antes</th>
            <th>Ahora</th>
            <th>Quién</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry: HistoryEntry, index) => (
            <tr key={`${entry.at}-${entry.entityId}-${entry.field}-${index}`}>
              <td className={styles.meta}>{when(entry.at)}</td>
              <td className={styles.code}>
                {entry.label}
                <span className={own.entity}>
                  {entry.entity === 'unit' ? 'unidad' : 'espacio'}
                </span>
              </td>
              <td>{FIELD_LABEL[entry.field]}</td>
              <td className={own.before}>{show(entry.field, entry.from)}</td>
              <td className={own.after}>{show(entry.field, entry.to)}</td>
              <td className={styles.meta}>{entry.byEmail || entry.by}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
