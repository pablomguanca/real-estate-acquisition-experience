import { useCallback, useEffect, useMemo, useState } from 'react';

import { CalibrationPanel } from './calibration/CalibrationPanel';
import { useProject } from './context/ProjectContext';
import { Experience } from './components/experience/Experience';
import { AmenityPanel } from './components/ui/AmenityPanel';
import { FloorList } from './components/ui/FloorList';
import { IntroOverlay } from './components/ui/IntroOverlay';
import { TopBar } from './components/ui/TopBar';
import { UnitPanel } from './components/ui/UnitPanel';
import { ViewControls } from './components/ui/ViewControls';
import { findFloor, findUnit } from './data/queries';

/**
 * Dueño del estado de interacción.
 *
 * El hover de los hotspots NO sube hasta acá: vive local en cada Hotspot. El
 * de pisos y unidades sí, porque la lista lateral y el edificio tienen que
 * resaltar lo mismo al mismo tiempo, y para eso necesitan compartir el dato.
 *
 * La UI en DOM se monta como hermana de <Experience />, nunca adentro del
 * Canvas: abrir un panel no vuelve a renderizar el árbol 3D.
 */

export type Mode = 'overview' | 'floors';

export function App() {
  const { project, scene } = useProject();

  /** El usuario pasó el overlay de entrada. */
  const [hasEntered, setHasEntered] = useState(false);
  /** El vuelo de apertura terminó, o el usuario lo interrumpió. */
  const [introDone, setIntroDone] = useState(false);

  const [mode, setMode] = useState<Mode>('overview');
  const [activeViewIndex, setActiveViewIndex] = useState(0);
  const [selectedAmenityId, setSelectedAmenityId] = useState<string | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [hoveredFloorId, setHoveredFloorId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [hoveredUnitId, setHoveredUnitId] = useState<string | null>(null);

  const selectedAmenity = useMemo(
    () => project.amenities.find((amenity) => amenity.id === selectedAmenityId) ?? null,
    [project.amenities, selectedAmenityId],
  );

  /** El piso abierto: el que muestra sus unidades en la escena. */
  const openFloor = useMemo(
    () => (mode === 'floors' ? findFloor(project.floors, selectedFloorId) : null),
    [project.floors, mode, selectedFloorId],
  );

  const selectedUnit = useMemo(
    () => findUnit(project.floors, selectedUnitId),
    [project.floors, selectedUnitId],
  );

  /**
   * El encuadre que le pedimos a la cámara.
   *
   * Acá se resuelve de dónde sale: del preset elegido con las flechas, o de
   * haber entrado a la torre. CameraRig recibe el resultado y no necesita
   * saber nada de modos ni de presets.
   */
  const view = useMemo(
    () => (mode === 'floors' ? scene.floorsView : scene.presets[activeViewIndex]!),
    [scene, mode, activeViewIndex],
  );

  // Estos handlers viajan como props hacia adentro del Canvas. Memorizarlos
  // evita que cada render de App le cambie las props a los objetos 3D.
  const handleIntroComplete = useCallback(() => setIntroDone(true), []);
  const handleSelectAmenity = useCallback((id: string) => setSelectedAmenityId(id), []);
  const handleCloseAmenity = useCallback(() => setSelectedAmenityId(null), []);
  const handleHoverFloor = useCallback((id: string | null) => setHoveredFloorId(id), []);
  const handleHoverUnit = useCallback((id: string | null) => setHoveredUnitId(id), []);
  const handleSelectUnit = useCallback((id: string) => setSelectedUnitId(id), []);
  const handleCloseUnit = useCallback(() => setSelectedUnitId(null), []);

  /** Tocar un piso entra al modo pisos y lo abre, en un solo gesto. */
  const handleSelectFloor = useCallback((id: string) => {
    setMode('floors');
    setSelectedFloorId(id);
    setSelectedAmenityId(null);
    // Cambiar de piso invalida la unidad abierta: era de otro piso.
    setSelectedUnitId(null);
    setHoveredUnitId(null);
  }, []);

  const handleBackToOverview = useCallback(() => {
    setMode('overview');
    setSelectedFloorId(null);
    setHoveredFloorId(null);
    setSelectedUnitId(null);
    setHoveredUnitId(null);
  }, []);

  const handleChangeView = useCallback((index: number) => {
    setActiveViewIndex(index);
    // Al cambiar de encuadre, el panel abierto queda hablando de un espacio
    // que ya no está en cuadro. Se cierra solo.
    setSelectedAmenityId(null);
  }, []);

  /**
   * Escape retrocede un nivel por vez: primero cierra la ficha de unidad,
   * recién después sale del modo pisos.
   *
   * La precedencia se decide acá y no frenando el evento desde el panel:
   * ambos oyentes viven en window, y cuál corre primero dependería de cuál se
   * montó antes. Este chequeo es determinista sin importar el orden.
   */
  useEffect(() => {
    if (mode !== 'floors') return;

    const handle = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Hay una ficha abierta: la cierra el propio panel, no nosotros.
      if (selectedUnitId !== null) return;
      handleBackToOverview();
    };

    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [mode, selectedUnitId, handleBackToOverview]);

  return (
    <>
      <Experience
        hasEntered={hasEntered}
        introDone={introDone}
        onIntroComplete={handleIntroComplete}
        view={view}
        mode={mode}
        selectedAmenityId={selectedAmenityId}
        onSelectAmenity={handleSelectAmenity}
        selectedFloorId={selectedFloorId}
        hoveredFloorId={hoveredFloorId}
        onHoverFloor={handleHoverFloor}
        onSelectFloor={handleSelectFloor}
        openFloor={openFloor}
        selectedUnitId={selectedUnitId}
        hoveredUnitId={hoveredUnitId}
        onHoverUnit={handleHoverUnit}
        onSelectUnit={handleSelectUnit}
      />

      <TopBar
        visible={hasEntered}
        showBack={mode === 'floors'}
        onBack={handleBackToOverview}
      />

      <ViewControls
        visible={introDone && mode === 'overview'}
        activeIndex={activeViewIndex}
        onChange={handleChangeView}
      />

      <FloorList
        visible={mode === 'floors'}
        selectedFloorId={selectedFloorId}
        hoveredFloorId={hoveredFloorId}
        onHoverFloor={handleHoverFloor}
        onSelectFloor={handleSelectFloor}
      />

      <AmenityPanel amenity={selectedAmenity} onClose={handleCloseAmenity} />

      <UnitPanel unit={selectedUnit} floor={openFloor} onClose={handleCloseUnit} />

      <IntroOverlay hidden={hasEntered} onEnter={() => setHasEntered(true)} />

      {/* Devuelve null si no hay capa de calibración montada. */}
      <CalibrationPanel />
    </>
  );
}
