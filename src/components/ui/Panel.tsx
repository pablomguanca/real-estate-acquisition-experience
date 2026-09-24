import { type ReactNode, useEffect, useRef } from 'react';

import styles from './Panel.module.scss';

/**
 * Contenedor de los paneles informativos.
 *
 * Queda siempre montado y se abre con un atributo. Desmontarlo al cerrar
 * cortaría la animación de salida, y guardar el último contenido en una ref
 * permite que siga visible mientras el panel se va.
 */

interface PanelProps {
  open: boolean;
  onClose: () => void;
  /** Nombre accesible del diálogo. */
  label?: string;
  /**
   * Desactiva el cierre con Escape mientras otra capa está encima.
   *
   * Sin esto, abrir el recorrido sobre la ficha y apretar Escape cerraría las
   * dos de un golpe: los dos oyentes viven en window y ninguno sabe del otro.
   * Misma razón por la que App decide la precedencia entre la ficha y el modo
   * pisos en vez de frenar el evento.
   */
  blockEscape?: boolean;
  children: ReactNode;
}

export function Panel({ open, onClose, label, blockEscape, children }: PanelProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const lastChildren = useRef<ReactNode>(null);
  const lastLabel = useRef<string | undefined>(undefined);

  if (open) {
    lastChildren.current = children;
    lastLabel.current = label;
  }

  // Una ficha recién abierta tiene que empezar por el principio. Sin esto
  // hereda la posición de scroll de la anterior, o la que el navegador deje
  // tras mover el foco, y el usuario entra a mitad de la ficha.
  useEffect(() => {
    if (!open) return;
    bodyRef.current?.scrollTo({ top: 0 });
  }, [open, children]);

  // Escape cierra el panel. Solo se escucha mientras está abierto.
  //
  // No intenta frenar el evento: App también escucha Escape para salir del
  // modo pisos, y hacer que uno gane por orden de listeners dependería de cuál
  // se montó primero. La precedencia la resuelve App, que es quien conoce
  // todo el estado. Ver el oyente de Escape en App.tsx.
  useEffect(() => {
    if (!open || blockEscape) return;

    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open, blockEscape, onClose]);

  return (
    <aside
      className={styles.panel}
      data-open={open || undefined}
      aria-hidden={!open}
      role="dialog"
      aria-label={open ? label : lastLabel.current}
    >
      <button
        type="button"
        className={styles.close}
        onClick={onClose}
        aria-label="Cerrar"
        tabIndex={open ? 0 : -1}
      >
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M4 4l8 8M12 4l-8 8"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* El scroll vive en el cuerpo y no en el panel: si scrolleara el panel
          entero, el botón de cierre se iría con el contenido. */}
      <div ref={bodyRef} className={styles.body}>
        {open ? children : lastChildren.current}
      </div>
    </aside>
  );
}
