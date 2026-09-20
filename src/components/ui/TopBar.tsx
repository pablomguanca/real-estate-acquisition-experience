import { useProject } from '../../context/ProjectContext';
import styles from './TopBar.module.scss';

/**
 * Franja superior. Deliberadamente casi vacía: la escena es la protagonista.
 *
 * Absorbe lo que en el plan original era un ProjectHeader aparte. Dos
 * componentes disputándose la franja de arriba es fuente garantizada de
 * conflictos de z-index y de layout.
 */

interface TopBarProps {
  visible: boolean;
  /** En modo pisos la barra ofrece la salida hacia la vista general. */
  showBack: boolean;
  onBack: () => void;
}

export function TopBar({ visible, showBack, onBack }: TopBarProps) {
  const { project } = useProject();

  return (
    <header className={styles.bar} data-visible={visible || undefined}>
      <span className={styles.name}>{project.name}</span>

      {showBack ? (
        <button type="button" className={styles.back} onClick={onBack}>
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M10 3L5 8l5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Vista general
        </button>
      ) : (
        <span className={styles.hint}>{project.tagline}</span>
      )}
    </header>
  );
}
