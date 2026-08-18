import { getSpatialCanvas } from './cameraRuntime';

const INTERACTIVE_SELECTOR = [
  'button:not(:disabled)',
  'input:not(:disabled)',
  'textarea:not(:disabled)',
  'select:not(:disabled)',
  'a[href]',
  '[role="button"]',
  '[data-hand-click]',
].join(',');

export function normalizedHandToClientPoint(x: number, y: number) {
  const rect = getSpatialCanvas()?.getBoundingClientRect() ?? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  return {
    x: rect.left + (1 - x) * Math.max(rect.width, 1),
    y: rect.top + y * Math.max(rect.height, 1),
  };
}

export function activateSpatialContentControl(windowId: string, x: number, y: number) {
  const point = normalizedHandToClientPoint(x, y);
  const hit = document.elementFromPoint(point.x, point.y) as HTMLElement | null;
  if (!hit) return null;
  const windowElement = hit.closest<HTMLElement>('[data-window-id]');
  if (!windowElement || windowElement.dataset.windowId !== windowId) return null;
  const content = hit.closest<HTMLElement>('[data-spatial-region="content"]');
  if (!content || !windowElement.contains(content)) return null;

  const control = hit.closest<HTMLElement>(INTERACTIVE_SELECTOR);
  if (!control || !content.contains(control)) return null;

  control.focus({ preventScroll: true });
  if (control.matches('button, a[href], [role="button"], [data-hand-click]')) control.click();
  return control;
}
