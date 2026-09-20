import { EMULATOR, getStorageBucket } from './firebase';

/**
 * Convierte una ruta de medios en una URL utilizable.
 *
 * Los datos guardan RUTAS —'projects/project-01/building.glb'— y nunca URLs
 * completas. Las download URL de Firebase Storage llevan un token revocable,
 * y atarse a ellas significa que mudar el bucket, cambiar de CDN o rotar un
 * token obliga a reescribir cada documento.
 *
 * Con rutas, los datos dicen QUÉ archivo es y este resolvedor decide DE DÓNDE
 * sale. Es el mismo principio que el repositorio aplicado a los binarios.
 *
 * Además tiene una propiedad práctica: sin bucket configurado, la misma ruta
 * resuelve contra /public. O sea que un desarrollo se puede montar entero en
 * el repo y migrar a Storage después sin tocar un solo dato.
 */
export function resolveMedia(path: string | null | undefined): string | null {
  if (!path) return null;

  // Ya es una URL o una ruta absoluta del sitio: se usa tal cual. Permite
  // convivir con material alojado fuera, sin casos especiales en los datos.
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
    return path;
  }

  if (EMULATOR.enabled) {
    // El emulador expone el mismo formato de descarga en otro host. Sin esta
    // rama, el panel subiría al emulador y mostraría URLs de producción.
    return `http://${EMULATOR.host}:${EMULATOR.storagePort}/v0/b/${
      EMULATOR.bucket
    }/o/${encodeURIComponent(path)}?alt=media`;
  }

  const bucket = getStorageBucket();
  if (!bucket) return `/${path}`;

  // Formato de acceso público de Storage. Requiere que las reglas permitan
  // lectura (ver storage.rules); a cambio es síncrono, mientras que
  // getDownloadURL obligaría a volver asíncrono todo lo que muestre un medio.
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
    path,
  )}?alt=media`;
}
