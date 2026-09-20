import { deleteObject, ref, uploadBytes } from 'firebase/storage';

import { getAdminStorage } from './firebase';

/**
 * Subida y borrado de imágenes.
 *
 * Devuelve la RUTA dentro del bucket, nunca una URL de descarga. Es la misma
 * decisión que atraviesa todo el sistema: los datos dicen qué archivo es y el
 * resolvedor de medios decide de dónde sale. Guardar URLs con token ataría
 * cada documento al hosting actual.
 *
 * Las validaciones de acá son cortesía para el usuario: las de verdad están
 * en storage.rules, que es lo único que un cliente no puede saltear.
 */

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export const ACCEPT_ATTRIBUTE = ACCEPTED.join(',');

export class MediaError extends Error {}

/**
 * Nombre seguro y único.
 *
 * Único porque dos fotos llamadas "IMG_1234.jpg" de unidades distintas no
 * deben pisarse. Seguro porque acentos y espacios en una ruta de Storage
 * complican el encodeURIComponent del resolvedor.
 */
function safeName(fileName: string): string {
  const extension = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : 'jpg';

  const base = fileName
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 40);

  const stamp = Date.now().toString(36);

  return `${base || 'imagen'}-${stamp}.${extension}`;
}

export function validate(file: File): void {
  if (!ACCEPTED.includes(file.type)) {
    throw new MediaError('Solo se aceptan imágenes JPG, PNG, WebP o AVIF.');
  }

  if (file.size > MAX_BYTES) {
    throw new MediaError('La imagen supera los 8 MB. Reducila antes de subirla.');
  }
}

/**
 * Sube un archivo y devuelve su ruta.
 *
 * @param folder Carpeta lógica dentro del desarrollo, por ejemplo
 *               'projects/project-01/units/floor-08-c'.
 */
export async function uploadMedia(folder: string, file: File): Promise<string> {
  validate(file);

  const path = `${folder}/${safeName(file.name)}`;
  await uploadBytes(ref(getAdminStorage(), path), file, { contentType: file.type });

  return path;
}

/**
 * Borra un archivo del bucket.
 *
 * Tolera que ya no exista: quitar una imagen de la galería no debe fallar
 * porque alguien la haya borrado antes desde la consola.
 */
export async function removeMedia(path: string): Promise<void> {
  try {
    await deleteObject(ref(getAdminStorage(), path));
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== 'storage/object-not-found') throw error;
  }
}
