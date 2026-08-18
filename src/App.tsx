import { useEffect } from 'react';
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

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(clearToast, 2600);
    return () => window.clearTimeout(id);
  }, [toast, clearToast]);

  return (
    <main className="desktop-shell">
      <SpatialScene />
      <div className="brand-lockup"><span className="brand-glyph">A</span><div><b>AEDRIAIN</b><small>SPATIAL DESKTOP · DOCUMENTS V1</small></div></div>
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
