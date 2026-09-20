import { useProject } from '../../context/ProjectContext';
import styles from './ViewControls.module.scss';

/**
 * Recorrido por los encuadres predefinidos.
 *
 * En desktop son un atajo; en mobile son el modo principal de navegación,
 * porque encontrar un buen ángulo arrastrando con el dedo es incómodo.
 */

interface ViewControlsProps {
  visible: boolean;
  activeIndex: number;
  onChange: (index: number) => void;
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d={direction === 'left' ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ViewControls({ visible, activeIndex, onChange }: ViewControlsProps) {
  const { scene } = useProject();
  const presets = scene.presets;
  const total = presets.length;

  // El recorrido es circular: nunca hay una flecha muerta.
  const step = (delta: number) => onChange((activeIndex + delta + total) % total);

  return (
    <nav className={styles.controls} data-visible={visible || undefined} aria-label="Vistas">
      <button
        type="button"
        className={styles.arrow}
        onClick={() => step(-1)}
        aria-label="Vista anterior"
        tabIndex={visible ? 0 : -1}
      >
        <Chevron direction="left" />
      </button>

      <span className={styles.label}>{presets[activeIndex]?.label}</span>

      <button
        type="button"
        className={styles.arrow}
        onClick={() => step(1)}
        aria-label="Vista siguiente"
        tabIndex={visible ? 0 : -1}
      >
        <Chevron direction="right" />
      </button>
    </nav>
  );
}
