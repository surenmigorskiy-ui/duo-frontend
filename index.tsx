import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('index.tsx: Starting app initialization...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('index.tsx: Root element not found!');
  throw new Error('Could not find root element to mount to');
}

console.log('index.tsx: Root element found, creating React root...');

try {
  const root = ReactDOM.createRoot(rootElement);
  console.log('index.tsx: React root created, rendering App...');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('index.tsx: App rendered successfully!');
} catch (error) {
  console.error('index.tsx: Error rendering app:', error);
  throw error;
}

