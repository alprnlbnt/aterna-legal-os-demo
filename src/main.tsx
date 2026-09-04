import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './theme/theme.css';
import './theme/density.css';

const root = document.getElementById('root');
if (!root) throw new Error('Aterna kök elementi bulunamadı.');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
