import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './storage/db';
import { REDUCED_MOTION_KEY, UI_SCALE_KEY } from './storage/defaults';
import { HandTrackingProvider } from './input/hand/HandTrackingProvider';
import { SpatialScene } from './spatial/SpatialScene';
import { useDesktopStore } from './store/useDesktopStore';
import { AppDock } from './ui/AppDock';
import { CommandBar } from './ui/CommandBar';
import { HandCursor } from './ui/HandCursor';
import { StatusHUD } from './ui/StatusHUD';

function DesktopShell() {
  const toast = useDesktopStore((s) => s.toast);
  const clearToast = useDesktopStore((s) => s.clearToast);
  const uiScale = Number(useLiveQuery(() => db.settings.get(UI_SCALE_KEY), [])?.value ?? 1);
  const reducedMotion = Boolean(useLiveQuery(() => db.settings.get(REDUCED_MOTION_KEY), [])?.value ?? false);

  useEffect(() => {
    document.documentElement.style.setProperty('--ui-scale', String(uiScale));
    document.documentElement.classList.toggle('aedriain-reduced-motion', reducedMotion);
  }, [reducedMotion, uiScale]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(clearToast, 2600);
    return () => window.clearTimeout(id);
  }, [toast, clearToast]);

  return (
    <main className="desktop-shell">
      <SpatialScene />
      <div className="brand-lockup"><span className="brand-glyph">A</span><div><b>AEDRIAIN</b><small>SPATIAL DESKTOP · DOCUMENTS V1.1</small></div></div>
      <StatusHUD />
      <AppDock />
      <CommandBar />
      <HandCursor />
      {toast && <div className="toast">{toast}</div>}
      <div className="gesture-help"><span>☝ POINT</span><span>🤏 HEADER · MOVE</span><span>🤏 CONTENT · INTERACT</span><span>🤏 🤏 MOVE / SCALE / ROTATE</span></div>
    </main>
  );
}

export default function App() {
  return <HandTrackingProvider><DesktopShell /></HandTrackingProvider>;
}
