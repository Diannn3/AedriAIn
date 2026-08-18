import { useDesktopStore } from '../store/useDesktopStore';
import type { CommandResult, DesktopCommand } from './types';

export function dispatchDesktopCommand(command: DesktopCommand): CommandResult {
  const store = useDesktopStore.getState();

  switch (command.type) {
    case 'APP_OPEN':
      store.openApp(command.appId);
      return { ok: true, message: `${command.appId} opened.` };
    case 'APP_CLOSE': {
      const target = store.windows.find((windowModel) => windowModel.appId === command.appId);
      if (!target) return { ok: false, message: `${command.appId} is not registered.` };
      store.closeWindow(target.id);
      return { ok: true, message: `${command.appId} closed.` };
    }
    case 'WORKSPACE_STUDY':
      store.applyStudyLayout();
      return { ok: true, message: 'Study layout applied.' };
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
