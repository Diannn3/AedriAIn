import { beforeEach, describe, expect, it } from 'vitest';
import { useDesktopStore } from './useDesktopStore';

beforeEach(() => {
  localStorage.clear();
  useDesktopStore.getState().resetWorkspace();
});

describe('workspace contracts', () => {
  it('opens Files when Research mode has no document yet', () => {
    useDesktopStore.getState().applyWorkspace('research');
    const state = useDesktopStore.getState();
    const files = state.windows.find((windowModel) => windowModel.appId === 'files');

    expect(files?.open).toBe(true);
    expect(files?.focused).toBe(true);
    expect(state.windows.some((windowModel) => windowModel.appId === 'document')).toBe(false);
  });

  it('focuses the primary document when Research mode has a document', () => {
    const documentWindowId = useDesktopStore.getState().spawnWindow('document', 'Research.pdf', 'document-resource');
    useDesktopStore.getState().applyWorkspace('research');
    const state = useDesktopStore.getState();
    const documentWindow = state.windows.find((windowModel) => windowModel.id === documentWindowId);
    const files = state.windows.find((windowModel) => windowModel.appId === 'files');

    expect(documentWindow?.open).toBe(true);
    expect(documentWindow?.focused).toBe(true);
    expect(files?.open).toBe(false);
  });

  it('removes every window attached to a deleted resource', () => {
    useDesktopStore.getState().spawnWindow('document', 'One.pdf', 'resource-one');
    useDesktopStore.getState().spawnWindow('document', 'One duplicate.pdf', 'resource-one');
    expect(useDesktopStore.getState().windows.filter((windowModel) => windowModel.resourceId === 'resource-one')).toHaveLength(2);
    useDesktopStore.getState().removeWindowsForResource('resource-one');
    expect(useDesktopStore.getState().windows.some((windowModel) => windowModel.resourceId === 'resource-one')).toBe(false);
  });
});
