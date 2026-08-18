import { useDesktopStore } from '../store/useDesktopStore';
import type { CommandResult, DesktopCommand } from './types';

export function dispatchDesktopCommand(command: DesktopCommand): CommandResult {
  const store = useDesktopStore.getState();

  switch (command.type) {
    case 'APP_OPEN':
      store.openApp(command.appId);
      return { ok: true, message: `${command.appId} opened.` };
    case 'APP_SPAWN':
      store.spawnWindow(command.appId);
      return { ok: true, message: `New ${command.appId} window created.` };
    case 'APP_CLOSE': {
      const target = store.windows.filter((windowModel) => windowModel.appId === command.appId && windowModel.open).sort((a, b) => b.zOrder - a.zOrder)[0];
      if (!target) return { ok: false, message: `${command.appId} is not open.` };
      store.closeWindow(target.id);
      return { ok: true, message: `${command.appId} closed.` };
    }
    case 'WINDOW_MINIMIZE':
      store.minimizeWindow(command.windowId);
      return { ok: true, message: 'Window minimized.' };
    case 'WINDOW_MAXIMIZE_TOGGLE':
      store.toggleMaximizeWindow(command.windowId);
      return { ok: true, message: 'Window size toggled.' };
    case 'WORKSPACE_APPLY':
      store.applyWorkspace(command.workspaceId);
      return { ok: true, message: `${command.workspaceId} workspace applied.` };
    case 'WORKSPACE_RESET':
      store.resetWorkspace();
      return { ok: true, message: 'Workspace reset.' };
    case 'WORKSPACE_SET_ALL':
      store.setAllOpen(command.open);
      return { ok: true, message: command.open ? 'All modules opened.' : 'All modules hidden.' };
    default: {
      const unreachable: never = command;
      return { ok: false, message: `Unsupported command: ${JSON.stringify(unreachable)}` };
    }
  }
}
