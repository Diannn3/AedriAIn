export interface VisibleRange {
  start: number;
  end: number;
}

function firstEndingAfter(starts: number[], sizes: number[], count: number, offset: number) {
  let low = 0;
  let high = count - 1;
  let answer = count - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const itemEnd = starts[middle] + sizes[middle];
    if (itemEnd >= offset) {
      answer = middle;
      high = middle - 1;
    } else {
      low = middle + 1;
    }
  }
  return answer;
}

function firstStartingAfter(starts: number[], count: number, offset: number) {
  let low = 0;
  let high = count - 1;
  let answer = count;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (starts[middle] > offset) {
      answer = middle;
      high = middle - 1;
    } else {
      low = middle + 1;
    }
  }
  return answer;
}

export function getVisibleRange(
  starts: number[],
  sizes: number[],
  count: number,
  scrollOffset: number,
  viewportSize: number,
  overscan: number,
): VisibleRange {
  if (!count) return { start: 0, end: -1 };
  const safeScroll = Math.max(0, scrollOffset);
  const viewportEnd = safeScroll + Math.max(viewportSize, 1);
  const start = firstEndingAfter(starts, sizes, count, safeScroll);
  const end = Math.max(start, Math.min(count - 1, firstStartingAfter(starts, count, viewportEnd)));
  return {
    start: Math.max(0, start - Math.max(0, overscan)),
    end: Math.min(count - 1, end + Math.max(0, overscan)),
  };
}
