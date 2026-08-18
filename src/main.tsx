import { StrictMode, useEffect, useState, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeStorage } from './storage/bootstrap';
import './styles.css';

const appBootstrap = initializeStorage().then(() => import('./App'));

function Bootstrap() {
  const [App, setApp] = useState<ComponentType | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    appBootstrap
      .then((module) => {
        if (active) setApp(() => module.default);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => { active = false; };
  }, []);

  if (error) return <div className="boot-screen boot-screen--error"><b>STORAGE OFFLINE</b><span>{error}</span></div>;
  if (!App) return <div className="boot-screen"><b>AEDRIAIN</b><span>INITIALIZING RESOURCE DATABASE…</span></div>;
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Bootstrap />
  </StrictMode>,
);
