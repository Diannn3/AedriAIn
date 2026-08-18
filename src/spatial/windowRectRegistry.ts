export interface RegisteredRect {
  id: string;
  rect: DOMRect;
}

const registry = new Map<string, DOMRect>();

export const setWindowRect = (id: string, rect: DOMRect) => registry.set(id, rect);
export const removeWindowRect = (id: string) => registry.delete(id);
export const getWindowAtPoint = (x: number, y: number) => {
  const entries = [...registry.entries()].reverse();
  return entries.find(([, rect]) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)?.[0] ?? null;
};
export const getWindowRect = (id: string) => registry.get(id) ?? null;
