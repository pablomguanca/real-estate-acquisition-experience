import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AdminApp } from './AdminApp';
import '../styles/global.scss';
import './admin-global.scss';

const container = document.getElementById('root');

if (!container) {
  throw new Error('No se encontró el elemento #root en admin.html');
}

createRoot(container).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
);
