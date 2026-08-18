import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { getVisibleRange } from './virtualMath';

export interface VirtualItem {
  index: number;
  start: number;
  size: number;
  end: number;
  key: number;
}

interface UseVirtualListOptions {
  count: number;
  scrollRef: RefObject<HTMLElement | null>;
  estimateSize: (index: number) => number;
  overscan?: number;
  resetKey?: string | number;
}

export function useVirtualList({ count, scrollRef, estimateSize, overscan = 3, resetKey = 0 }: UseVirtualListOptions) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [viewportSize, setViewportSize] = useState(0);
  const [measureVersion, setMeasureVersion] = useState(0);
  const measuredSizesRef = useRef(new Map<number, number>());
  const observerRef = useRef<ResizeObserver | null>(null);
  const observedRef = useRef(new Map<number, Element>());

  const offsets = useMemo(() => {
    const starts = new Array<number>(count);
    const sizes = new Array<number>(count);
    let cursor = 0;
    for (let index = 0; index < count; index += 1) {
      starts[index] = cursor;
      const size = measuredSizesRef.current.get(index) ?? Math.max(1, estimateSize(index));
      sizes[index] = size;
      cursor += size;
    }
    return { starts, sizes, totalSize: cursor };
  // measureVersion invalidates the memo when ResizeObserver records a new size.
  }, [count, estimateSize, measureVersion]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const update = () => {
      setScrollOffset(node.scrollTop);
      setViewportSize(node.clientHeight);
    };
    update();
    node.addEventListener('scroll', update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(node);
    return () => {
      node.removeEventListener('scroll', update);
      resize.disconnect();
    };
  }, [scrollRef]);

  const ensureObserver = useCallback(() => {
    if (observerRef.current) return observerRef.current;
    observerRef.current = new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        const match = Array.from(observedRef.current.entries()).find(([, element]) => element === entry.target);
        const index = match?.[0];
        if (index == null) continue;
        const nextSize = Math.max(1, entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height);
        const previous = measuredSizesRef.current.get(index);
        if (previous == null || Math.abs(previous - nextSize) > 0.5) {
          measuredSizesRef.current.set(index, nextSize);
          changed = true;
        }
      }
      if (changed) setMeasureVersion((value) => value + 1);
    });
    return observerRef.current;
  }, []);

  useEffect(() => () => { observerRef.current?.disconnect(); observedRef.current.clear(); }, []);

  useEffect(() => {
    measuredSizesRef.current.clear();
    setMeasureVersion((value) => value + 1);
  }, [resetKey]);

  const measureElement = useCallback((index: number, node: HTMLElement | null) => {
    const observer = ensureObserver();
    const previous = observedRef.current.get(index);
    if (previous && previous !== node) {
      observer.unobserve(previous);
      observedRef.current.delete(index);
    }
    if (!node) return;
    observedRef.current.set(index, node);
    observer.observe(node);
  }, [ensureObserver]);

  const visibleRange = useMemo(
    () => getVisibleRange(offsets.starts, offsets.sizes, count, scrollOffset, viewportSize, overscan),
    [count, offsets, overscan, scrollOffset, viewportSize],
  );

  const virtualItems = useMemo(() => {
    const items: VirtualItem[] = [];
    for (let index = visibleRange.start; index <= visibleRange.end; index += 1) {
      const start = offsets.starts[index] ?? 0;
      const size = offsets.sizes[index] ?? estimateSize(index);
      items.push({ index, start, size, end: start + size, key: index });
    }
    return items;
  }, [estimateSize, offsets, visibleRange]);

  const scrollToIndex = useCallback((index: number, align: 'start' | 'center' = 'start') => {
    const node = scrollRef.current;
    if (!node || !count) return;
    const safeIndex = Math.max(0, Math.min(count - 1, index));
    const start = offsets.starts[safeIndex] ?? 0;
    const size = offsets.sizes[safeIndex] ?? estimateSize(safeIndex);
    const top = align === 'center' ? start - Math.max(0, (node.clientHeight - size) / 2) : start;
    node.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
  }, [count, estimateSize, offsets, scrollRef]);

  return {
    virtualItems,
    totalSize: offsets.totalSize,
    scrollOffset,
    viewportSize,
    measureElement,
    scrollToIndex,
  };
}
