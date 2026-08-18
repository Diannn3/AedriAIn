import type { AppId } from '../core/types';

export type DesktopCommand =
  | { type: 'APP_OPEN'; appId: AppId }
  | { type: 'APP_CLOSE'; appId: AppId }
  | { type: 'WORKSPACE_STUDY' }
  | { type: 'WORKSPACE_RESET' }
  | { type: 'WORKSPACE_SET_ALL'; open: boolean };

export interface CommandResult {
  ok: boolean;
  message: string;
}
