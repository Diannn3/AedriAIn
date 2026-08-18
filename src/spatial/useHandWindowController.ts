import { useEffect, useRef } from 'react';
import { handRuntime } from '../input/hand/handRuntime';
import { useDesktopStore } from '../store/useDesktopStore';
import { getWindowAtPoint, getWindowRect } from './windowRectRegistry';

interface DragState {
  id: string;
  pointerX: number;
  pointerY: number;
  startPosition: [number, number, number];
}

interface TransformState {
  id: string;
  startDistance: number;
  startAngle: number;
  startScale: number;
  startRotation: number;
}

export function useHandWindowController() {
  const dragRef = useRef<DragState | null>(null);
  const transformRef = useRef<TransformState | null>(null);
  const wasPinchingRef = useRef(false);

  useEffect(() => {
    return handRuntime.subscribe((state) => {
      const visibleHands = state.hands.map((hand) => ({
        ...hand,
        screenX: (1 - hand.pointer.x) * window.innerWidth,
        screenY: hand.pointer.y * window.innerHeight,
      }));
      const pinching = visibleHands.filter((hand) => hand.pinching);
      const desktop = useDesktopStore.getState();

      if (pinching.length >= 2) {
        dragRef.current = null;
        const [a, b] = pinching;
        const distance = Math.hypot(a.screenX - b.screenX, a.screenY - b.screenY);
        const angle = Math.atan2(b.screenY - a.screenY, b.screenX - a.screenX);
        const midX = (a.screenX + b.screenX) / 2;
        const midY = (a.screenY + b.screenY) / 2;

        if (!transformRef.current) {
          const aWindow = getWindowAtPoint(a.screenX, a.screenY);
          const bWindow = getWindowAtPoint(b.screenX, b.screenY);
          const midWindow = getWindowAtPoint(midX, midY);
          const id = aWindow && aWindow === bWindow ? aWindow : midWindow;
          if (id) {
            const model = desktop.windows.find((w) => w.id === id);
            if (model) {
              desktop.focusWindow(id);
              transformRef.current = { id, startDistance: Math.max(distance, 20), startAngle: angle, startScale: model.scale, startRotation: model.rotationZ };
            }
          }
        } else {
          const tx = transformRef.current;
          desktop.setWindowTransform(tx.id, {
            scale: Math.min(1.75, Math.max(0.65, tx.startScale * (distance / tx.startDistance))),
            rotationZ: tx.startRotation + (angle - tx.startAngle),
          });
        }
        wasPinchingRef.current = true;
        return;
      }

      transformRef.current = null;
      const primary = visibleHands[0];
      if (!primary) {
        dragRef.current = null;
        wasPinchingRef.current = false;
        return;
      }

      if (primary.pinching && !wasPinchingRef.current) {
        const id = getWindowAtPoint(primary.screenX, primary.screenY);
        const model = id ? desktop.windows.find((w) => w.id === id) : null;
        if (id && model) {
          desktop.focusWindow(id);
          dragRef.current = { id, pointerX: primary.screenX, pointerY: primary.screenY, startPosition: [...model.position] };
        }
      }

      if (primary.pinching && dragRef.current) {
        const drag = dragRef.current;
        const dx = primary.screenX - drag.pointerX;
        const dy = primary.screenY - drag.pointerY;
        const worldDX = (dx / window.innerWidth) * 8.2;
        const worldDY = -(dy / window.innerHeight) * 4.7;
        desktop.setWindowTransform(drag.id, {
          position: [drag.startPosition[0] + worldDX, drag.startPosition[1] + worldDY, drag.startPosition[2]],
        });
      }

      if (!primary.pinching) dragRef.current = null;
      wasPinchingRef.current = primary.pinching;

      if (primary.gesture === 'FIST') {
        const focused = desktop.windows.find((w) => w.focused);
        if (focused) {
          const rect = getWindowRect(focused.id);
          if (rect && primary.screenX >= rect.left && primary.screenX <= rect.right && primary.screenY >= rect.top && primary.screenY <= rect.bottom) {
            desktop.setWindowTransform(focused.id, { rotationZ: 0 });
          }
        }
      }
    });
  }, []);
}
