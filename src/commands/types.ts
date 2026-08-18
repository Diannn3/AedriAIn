import type { AppId } from '../core/types';
import type { WorkspaceId } from '../workspaces/layouts';

export type DesktopCommand =
  | { type: 'APP_OPEN'; appId: AppId }
  | { type: 'APP_SPAWN'; appId: AppId }
  | { type: 'APP_CLOSE'; appId: AppId }
  | { type: 'WINDOW_MINIMIZE'; windowId: string }
  | { type: 'WINDOW_MAXIMIZE_TOGGLE'; windowId: string }
  | { type: 'WORKSPACE_APPLY'; workspaceId: WorkspaceId }
  | { type: 'WORKSPACE_RESET' }
  | { type: 'WORKSPACE_SET_ALL'; open: boolean };

export interface CommandResult {
  ok: boolean;
  message: string;
}
