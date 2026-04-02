import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handler for debugging
window.onerror = (message, source, lineno, colno, error) => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; color: red; font-family: monospace; background: #111; height: 100vh;">
        <h1>Runtime Error</h1>
        <p>${message}</p>
        <pre>${error?.stack || ''}</pre>
        <p>Source: ${source}:${lineno}:${colno}</p>
      </div>
    `;
  }
};

createRoot(document.getElementById('root')!).render(
  <App />,
);
