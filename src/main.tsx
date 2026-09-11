import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './theme/theme.css';
import './theme/density.css';
import './theme/print.css';

try {
  const persisted = JSON.parse(localStorage.getItem('aterna-demo-state') ?? '{}') as {
    state?: { settings?: { theme?: 'light' | 'dark' } };
  };
  document.documentElement.dataset.theme = persisted.state?.settings?.theme ?? 'light';
} catch {
  document.documentElement.dataset.theme = 'light';
}

const root = document.getElementById('root');
if (!root) throw new Error('Aterna kök elementi bulunamadı.');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
