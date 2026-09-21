import { type FormEvent, useEffect, useState } from 'react';
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import { AmenitiesEditor } from './AmenitiesEditor';
import { HistoryView } from './HistoryView';
import { UnitsTable } from './UnitsTable';
import { getAdminAuth, isAdminConfigured, isUsingEmulators } from './firebase';
import { useProjects } from './useProjects';
import { type Session, useSession } from './useSession';
import styles from './admin.module.scss';
import units from './units.module.scss';

/**
 * Panel de administración.
 *
 * Resuelve quién entra, con qué rol y sobre qué desarrollos, y después le
 * entrega la lista de precios editable.
 *
 * Vive en su propio punto de entrada (admin.html) y no comparte bundle con la
 * experiencia pública: el visitante nunca descarga esto.
 */

/**
 * Mensaje único del reseteo, haya salido el correo o no.
 *
 * Decir "esa dirección no existe" le confirma a un atacante qué cuentas son
 * reales. Es el mismo criterio que el error de credenciales del login.
 */
const RESET_ENVIADO =
  'Si esa dirección tiene una cuenta, le mandamos un enlace para cambiar la ' +
  'contraseña. Mirá también el correo no deseado.';

function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await signInWithEmailAndPassword(getAdminAuth(), email, password);
    } catch {
      // Un mensaje único para credenciales incorrectas: distinguir "ese mail
      // no existe" de "la contraseña está mal" le confirma a un atacante qué
      // cuentas son reales.
      setError('No pudimos iniciar sesión con esos datos.');
      setBusy(false);
    }
  };

  /**
   * Reseteo por correo.
   *
   * Sin esto, cada contraseña olvidada es un pedido a Atenea y una entrada a
   * la consola de Firebase. Con una desarrolladora externa editando precios,
   * eso no escala ni puede esperar al lunes.
   *
   * Usa el email ya tecleado arriba en vez de abrir otra pantalla: es el dato
   * que la persona acaba de escribir, y pedirlo de nuevo sería un formulario
   * más para algo que pasa en un mal momento.
   */
  const resetPassword = async () => {
    const address = email.trim();

    if (!address) {
      setError('Escribí tu email arriba y volvé a tocar acá.');
      return;
    }

    setSending(true);
    setError(null);
    setNotice(null);

    try {
      await sendPasswordResetEmail(getAdminAuth(), address);
      setNotice(RESET_ENVIADO);
    } catch (cause) {
      const code = (cause as { code?: string }).code;

      if (code === 'auth/user-not-found') {
        // Se responde igual que si hubiera salido: ver RESET_ENVIADO.
        setNotice(RESET_ENVIADO);
      } else if (code === 'auth/invalid-email') {
        setError('Esa dirección no tiene formato de email.');
      } else if (code === 'auth/too-many-requests') {
        setError('Demasiados intentos. Probá de nuevo en unos minutos.');
      } else {
        setError('No pudimos enviar el correo. Intentá de nuevo en un rato.');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.center}>
      <p className={styles.brand}>Sistema de Adquisición</p>
      <h1 className={styles.title}>Panel</h1>

      <form className={styles.form} onSubmit={submit}>
        <label className={styles.field}>
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className={styles.field}>
          <span>Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className={styles.error}>{error}</p>}
        {notice && <p className={styles.notice}>{notice}</p>}

        <button type="submit" className={styles.button} disabled={busy || sending}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>

        <button
          type="button"
          className={styles.linkButton}
          onClick={resetPassword}
          disabled={busy || sending}
        >
          {sending ? 'Enviando…' : 'Olvidé mi contraseña'}
        </button>
      </form>

      {isUsingEmulators() && (
        <span className={styles.emulatorFlag}>Emuladores locales</span>
      )}
    </div>
  );
}

export function AdminApp() {
  const session = useSession();

  if (!isAdminConfigured()) {
    return (
      <div className={styles.center}>
        <h1 className={styles.title}>Falta configuración</h1>
        <p className={styles.message}>
          Esta copia se construyó sin la configuración de Firebase.
        </p>
        <p className={styles.message}>
          En un sitio publicado: cargá las variables <code>VITE_FIREBASE_*</code> en el
          hosting y volvé a desplegar — un despliegue ya hecho no las toma.
        </p>
        <p className={styles.message}>
          En tu máquina: completá <code>.env.local</code>, o poné{' '}
          <code>VITE_USE_EMULATORS=1</code> para trabajar contra los emuladores.
        </p>
      </div>
    );
  }

  if (session.status === 'loading') {
    return (
      <div className={styles.center}>
        <p className={styles.message}>Verificando sesión…</p>
      </div>
    );
  }

  if (session.status === 'signed-out') return <SignIn />;

  if (session.status === 'no-access') {
    return (
      <div className={styles.center}>
        <h1 className={styles.title}>Sin acceso</h1>
        <p className={styles.message}>
          La cuenta <strong>{session.user.email}</strong> existe pero todavía no tiene
          permisos asignados. Pedile a Atenea que te habilite los desarrollos que
          necesitás editar.
        </p>
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => signOut(getAdminAuth())}
        >
          Salir
        </button>
      </div>
    );
  }

  return <Workspace session={session} />;
}

function Workspace({
  session,
}: {
  session: Extract<Session, { status: 'ready' }>;
}) {
  const { user, access } = session;
  const slugs = useProjects(access);
  const [selected, setSelected] = useState<string | null>(null);
  const [section, setSection] = useState<'units' | 'amenities' | 'history'>('units');

  // El autor de cada cambio. El correo viaja con la anotación para poder leer
  // el historial sin tener que resolver un uid contra Authentication.
  const author = { uid: user.uid, email: user.email ?? '' };

  // El primer desarrollo disponible, en cuanto se sepa cuáles son. Un editor
  // con uno solo no tiene que elegir nada.
  useEffect(() => {
    if (slugs && slugs.length > 0 && selected === null) setSelected(slugs[0]!);
  }, [slugs, selected]);

  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <span className={styles.brand}>Sistema de Adquisición</span>

        <div className={styles.who}>
          {isUsingEmulators() && (
            <span className={styles.emulatorFlag}>Emuladores</span>
          )}
          <span className={styles.role}>{access.role}</span>
          <span>{user.email}</span>
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => signOut(getAdminAuth())}
          >
            Salir
          </button>
        </div>
      </header>

      <main className={styles.content}>
        {slugs === null && <p className={styles.message}>Cargando desarrollos…</p>}

        {slugs?.length === 0 && (
          <p className={styles.message}>
            Todavía no tenés desarrollos asignados. Pedile a Atenea que te habilite los
            que necesites editar.
          </p>
        )}

        {slugs && slugs.length > 1 && (
          <div className={units.projectTabs}>
            {slugs.map((slug) => (
              <button
                key={slug}
                type="button"
                className={units.projectTab}
                data-active={slug === selected || undefined}
                onClick={() => setSelected(slug)}
              >
                {slug}
              </button>
            ))}
          </div>
        )}

        {selected && (
          <>
            <nav className={units.tabs}>
              <button
                type="button"
                className={units.tab}
                data-active={section === 'units' || undefined}
                onClick={() => setSection('units')}
              >
                Unidades
              </button>
              <button
                type="button"
                className={units.tab}
                data-active={section === 'amenities' || undefined}
                onClick={() => setSection('amenities')}
              >
                Espacios comunes
              </button>
              <button
                type="button"
                className={units.tab}
                data-active={section === 'history' || undefined}
                onClick={() => setSection('history')}
              >
                Historial
              </button>
            </nav>

            {/* Con key por desarrollo: cambiar de proyecto tiene que descartar
                las ediciones pendientes, no arrastrarlas a otra base de datos. */}
            {section === 'units' && (
              <UnitsTable key={selected} slug={selected} author={author} canEdit />
            )}
            {section === 'amenities' && (
              <AmenitiesEditor key={selected} slug={selected} author={author} canEdit />
            )}
            {section === 'history' && <HistoryView key={selected} slug={selected} />}
          </>
        )}
      </main>
    </div>
  );
}
