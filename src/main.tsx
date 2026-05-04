import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Global error handler to catch initialization crashes
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global Error caught:', { message, source, lineno, colno, error });
  const root = document.getElementById('root');
  if (root && root.innerHTML === '') {
    root.innerHTML = '<div style="padding: 20px; color: red; font-family: sans-serif;">' +
      '<h1>Application Error</h1>' +
      '<p>Something went wrong during initialization. Please check the console for details.</p>' +
      '</div>';
  }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
