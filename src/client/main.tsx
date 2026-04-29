import React from 'react';
import { createRoot } from 'react-dom/client';

const root = document.getElementById('root');
if (!root) throw new Error('root element missing');

createRoot(root).render(
  <React.StrictMode>
    <main style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ margin: 0 }}>Pulsefile</h1>
      <p style={{ color: '#888', marginTop: 8 }}>
        Diagnostic instrument for the open web - work in progress.
      </p>
    </main>
  </React.StrictMode>,
);
