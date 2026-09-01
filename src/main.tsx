import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppProvider } from './state/store';
import { UiProvider } from './state/ui';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <UiProvider>
        <App />
      </UiProvider>
    </AppProvider>
  </StrictMode>,
);
