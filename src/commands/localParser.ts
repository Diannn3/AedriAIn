import type { AppId } from '../core/types';
import type { DesktopCommand } from './types';

const aliases: Array<[RegExp, AppId]> = [
  [/\bnotes?\b/i, 'notes'],
  [/\btasks?\b/i, 'tasks'],
  [/\bcalendar\b|\bschedule\b/i, 'calendar'],
  [/\bmaps?\b/i, 'map'],
  [/\bfiles?\b|\bdocuments?\b/i, 'files'],
  [/\b(ai|assistant|console)\b/i, 'assistant'],
];

export function parseLocalCommand(input: string): DesktopCommand | null {
  const text = input.trim();
  if (!text) return null;
  const app = aliases.find(([pattern]) => pattern.test(text))?.[1];

  if (/\b(study mode|study layout|study workspace)\b/i.test(text)) return { type: 'WORKSPACE_APPLY', workspaceId: 'study' };
  if (/\b(planning mode|planning layout|planning workspace)\b/i.test(text)) return { type: 'WORKSPACE_APPLY', workspaceId: 'planning' };
  if (/\b(minimal mode|minimal layout|minimal workspace)\b/i.test(text)) return { type: 'WORKSPACE_APPLY', workspaceId: 'minimal' };
  if (/\breset( workspace| layout)?\b/i.test(text)) return { type: 'WORKSPACE_RESET' };
  if (/\b(show|open) all\b/i.test(text)) return { type: 'WORKSPACE_SET_ALL', open: true };
  if (/\b(hide|close) all\b/i.test(text)) return { type: 'WORKSPACE_SET_ALL', open: false };
  if (app && /\b(new|another|spawn|create)\b/i.test(text)) return { type: 'APP_SPAWN', appId: app };
  if (app && /\b(close|hide|dismiss)\b/i.test(text)) return { type: 'APP_CLOSE', appId: app };
  if (app) return { type: 'APP_OPEN', appId: app };
  return null;
}
