import { useProject } from '../../context/ProjectContext';
import styles from './IntroOverlay.module.scss';

/**
 * Pantalla de entrada.
 *
 * No es decorativa: cubre la carga de la escena, así el usuario nunca ve un
 * modelo a medio aparecer ni un canvas vacío. El click del usuario es también
 * la señal para arrancar el vuelo de apertura, que conviene disparar cuando
 * ya hay alguien mirando.
 */

interface IntroOverlayProps {
  hidden: boolean;
  onEnter: () => void;
}

export function IntroOverlay({ hidden, onEnter }: IntroOverlayProps) {
  const { project } = useProject();

  return (
    <div className={styles.overlay} data-hidden={hidden || undefined} aria-hidden={hidden}>
      <h1 className={styles.name}>{project.name}</h1>
      <span className={styles.rule} />
      <button
        type="button"
        className={styles.enter}
        onClick={onEnter}
        tabIndex={hidden ? -1 : 0}
      >
        Explore the project
      </button>
    </div>
  );
}
