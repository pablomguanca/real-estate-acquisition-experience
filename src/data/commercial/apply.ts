import type { Project } from '../../types/project';
import type { ProjectCommercial } from '../../types/commercial';

/**
 * Superpone la capa comercial sobre la definición del desarrollo.
 *
 * Función pura: recibe los dos lados y devuelve uno nuevo. Eso la hace
 * verificable sin red y deja explícita la regla de precedencia, que es la
 * parte delicada.
 *
 * La regla: un campo ausente en Firestore conserva el del archivo. No se
 * interpreta "vacío" como "borrar". Así, cargar parcialmente la capa
 * comercial —muy normal mientras se da de alta un desarrollo— degrada a los
 * valores del archivo en vez de vaciar la ficha.
 *
 * Ojo con `price`: null SÍ es un valor válido y significa "sin precio
 * publicado". Por eso se compara contra undefined y no por verdad.
 */
export function applyCommercial(
  definition: Project,
  commercial: ProjectCommercial,
): Project {
  const floors = definition.floors.map((floor) => ({
    ...floor,
    units: floor.units.map((unit) => {
      const overlay = commercial.units[unit.id];
      if (!overlay) return unit;

      return {
        ...unit,
        status: overlay.status ?? unit.status,
        price: overlay.price !== undefined ? overlay.price : unit.price,
        gallery: overlay.gallery ?? unit.gallery,
      };
    }),
  }));

  const amenities = definition.amenities.map((amenity) => {
    const overlay = commercial.amenities[amenity.id];
    if (!overlay) return amenity;

    return {
      ...amenity,
      name: overlay.name ?? amenity.name,
      description: overlay.description ?? amenity.description,
    };
  });

  return { ...definition, floors, amenities };
}
