import styles from './BootScreen.module.scss';

/**
 * Lo que se ve antes de que exista el desarrollo: carga y error.
 *
 * Con el repositorio local es un parpadeo. Contra Firestore es una espera de
 * red real, y ahí importa que el primer frame ya se vea como la experiencia y
 * no como una página en blanco.
 */

interface BootScreenProps {
  /** Sin mensaje es la pantalla de carga; con mensaje, la de error. */
  message?: string;
}

export function BootScreen({ message }: BootScreenProps) {
  return (
    <div className={styles.screen} role="status" aria-live="polite">
      {message ? (
        <>
          <p className={styles.title}>No se pudo cargar el desarrollo</p>
          <p className={styles.message}>{message}</p>
        </>
      ) : (
        <span className={styles.pulse} />
      )}
    </div>
  );
}
