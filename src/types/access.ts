/**
 * Modelo de acceso del Sistema de Adquisición.
 *
 * Dos roles y nada más, porque dos alcanzan y cada rol extra es una regla más
 * que puede tener un agujero:
 *
 *   admin   Atenea. Edita cualquier desarrollo.
 *   editor  La desarrolladora. Edita solo los desarrollos que tiene asignados.
 *
 * Vive en Firestore y no en custom claims de Auth. Los claims serían más
 * baratos —no cuestan una lectura por evaluación— pero exigen un backend para
 * asignarlos y no se pueden inspeccionar desde la consola. Con un documento,
 * dar de alta a alguien es visible y auditable. Si algún día el costo de las
 * lecturas molesta, migrar a claims no cambia la forma del modelo.
 */

export type UserRole = 'admin' | 'editor';

export interface UserAccess {
  role: UserRole;
  /** Slugs que puede editar. Se ignora cuando el rol es admin. */
  projects: string[];
  /** Solo para mostrar en el panel; la autoridad la tiene el uid. */
  email: string;
  name?: string;
}
