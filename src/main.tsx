import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { CalibrationLayer, isCalibrationEnabled } from './calibration/CalibrationLayer';
import { BootScreen } from './components/ui/BootScreen';
import { ProjectGate } from './context/ProjectContext';
import './styles/global.scss';

const container = document.getElementById('root');

if (!container) {
  throw new Error('No se encontró el elemento #root en index.html');
}

/**
 * Qué desarrollo se muestra.
 *
 * Sale de la query string para que la plataforma pueda servir a varios sin
 * necesidad de router ni de un build por cliente: /?project=otro-desarrollo.
 * Es lo mínimo que hace falta para que esto sea un sistema y no una pieza a
 * medida; el selector de desarrollos vendrá después y usará lo mismo.
 */
const DEFAULT_PROJECT_SLUG = 'project-01';

const slug =
  new URLSearchParams(window.location.search).get('project') ?? DEFAULT_PROJECT_SLUG;

/**
 * En calibración, App se envuelve en una capa que parchea la escena en vivo.
 * Sin el parámetro, ese código no se monta y la experiencia es exactamente
 * la que ve un visitante.
 */
const experience = isCalibrationEnabled() ? (
  <CalibrationLayer>
    <App />
  </CalibrationLayer>
) : (
  <App />
);

createRoot(container).render(
  <StrictMode>
    <ProjectGate
      slug={slug}
      renderLoading={() => <BootScreen />}
      renderError={(message) => <BootScreen message={message} />}
    >
      {experience}
    </ProjectGate>
  </StrictMode>,
);
