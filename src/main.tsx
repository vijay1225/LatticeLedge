import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Global error handlers to prevent silent blank screens
window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Global Unhandled Rejection]', event.reason);
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary fallbackTitle="LatticeLedger Encountered an Unexpected Error">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
