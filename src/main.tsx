import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx'; // Make sure this is App, NOT Main
import './index.css';
import 'pixel-retroui/dist/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
