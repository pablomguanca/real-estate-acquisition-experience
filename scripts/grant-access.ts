/**
 * Alta y baja de acceso al panel.
 *
 * Es la única manera de crear o modificar un documento de usuario: las reglas
 * prohíben escribir en users/ desde el cliente, incluso el propio. Si no fuera
 * así, cualquier editor podría agregarse desarrollos y el modelo de roles no
 * significaría nada.
 *
 * Uso (PowerShell):
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = "$HOME\.secrets\atenea-service-account.json"
 *   npm run grant -- ana@desarrolladora.com editor project-01
 *   npm run grant -- equipo@atenea.com admin
 *
 * La clave de cuenta de servicio SÍ es un secreto, a diferencia de la
 * configuración web: da acceso de administrador y saltea todas las reglas.
 * Por eso vive FUERA del proyecto, no donde se copia, se comprime o se
 * versiona el código. Se descarga de Firebase Console > Configuración >
 * Cuentas de servicio.
 *
 * Requiere que la persona ya exista en Firebase Authentication: el uid sale de
 * ahí. Crear la cuenta es un paso aparte y deliberado, en la consola o por
 * invitación, porque implica una credencial.
 */
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

import type { UserRole } from '../src/types/access';

const ROLES: UserRole[] = ['admin', 'editor'];

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main() {
  const [email, role, ...projects] = process.argv.slice(2);

  if (!email || !role) {
    fail(
      'Uso: npm run grant -- <email> <admin|editor> [slug...]\n' +
        'Ejemplo: npm run grant -- ana@desarrolladora.com editor project-01',
    );
  }

  if (!ROLES.includes(role as UserRole)) {
    fail(`Rol inválido: "${role}". Tiene que ser admin o editor.`);
  }

  if (role === 'editor' && projects.length === 0) {
    fail('Un editor sin desarrollos asignados no podría editar nada. Indicá al menos uno.');
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    fail('Falta GOOGLE_APPLICATION_CREDENTIALS apuntando a la clave de cuenta de servicio.');
  }

  initializeApp({ credential: applicationDefault() });

  // El uid lo manda Authentication, no lo elegimos nosotros: es lo que las
  // reglas van a comparar contra request.auth.uid.
  const user = await getAuth()
    .getUserByEmail(email)
    .catch(() =>
      fail(
        `No existe "${email}" en Firebase Authentication.\n` +
          'Creá la cuenta primero en Console > Authentication > Usuarios.',
      ),
    );

  await getFirestore()
    .collection('users')
    .doc(user.uid)
    .set(
      {
        role,
        // Un admin llega a todo, así que la lista no se usa. Se guarda vacía
        // para que el documento tenga siempre la misma forma.
        projects: role === 'admin' ? [] : projects,
        email,
        name: user.displayName ?? null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

  const scope = role === 'admin' ? 'todos los desarrollos' : projects.join(', ');
  console.log(`Acceso otorgado a ${email} (${user.uid}) como ${role}: ${scope}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
