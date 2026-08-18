import { apps } from '../apps/registry';
import { useDesktopStore } from '../store/useDesktopStore';

export function AppDock() {
  const openApp = useDesktopStore((s) => s.openApp);
  const windows = useDesktopStore((s) => s.windows);
  return (
    <nav className="app-dock" aria-label="Spatial apps">
      {Object.values(apps).map((app) => {
        const open = windows.find((w) => w.appId === app.id)?.open;
        return <button key={app.id} className={open ? 'app-dock__item app-dock__item--open' : 'app-dock__item'} onClick={() => openApp(app.id)} title={app.title}><span>{app.icon}</span><small>{app.title}</small></button>;
      })}
    </nav>
  );
}
