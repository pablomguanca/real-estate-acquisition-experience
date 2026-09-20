import { useProject } from '../../context/ProjectContext';
import { Hotspot } from './Hotspot';

/**
 * Recorre los datos y dibuja un marcador por espacio.
 *
 * La separación importa: este componente sabe de dónde salen los amenities,
 * Hotspot no. Hoy salen del desarrollo cargado; da igual si detrás hay un
 * archivo del repo o Firestore.
 */

interface HotspotsProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function Hotspots({ selectedId, onSelect }: HotspotsProps) {
  const { project } = useProject();

  return (
    <>
      {project.amenities.map((amenity) => (
        <Hotspot
          key={amenity.id}
          amenity={amenity}
          isSelected={selectedId === amenity.id}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}
