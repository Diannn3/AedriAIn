import { describe, expect, it } from 'vitest';
import { parseLocalCommand } from './localParser';

describe('parseLocalCommand', () => {
  it.each([
    ['open map', { type: 'APP_OPEN', appId: 'map' }],
    ['close my notes', { type: 'APP_CLOSE', appId: 'notes' }],
    ['study mode', { type: 'WORKSPACE_APPLY', workspaceId: 'study' }],
    ['planning mode', { type: 'WORKSPACE_APPLY', workspaceId: 'planning' }],
    ['new notes', { type: 'APP_SPAWN', appId: 'notes' }],
    ['reset workspace', { type: 'WORKSPACE_RESET' }],
    ['hide all', { type: 'WORKSPACE_SET_ALL', open: false }],
  ])('%s', (input, expected) => {
    expect(parseLocalCommand(input)).toEqual(expected);
  });

  it('rejects unknown commands', () => {
    expect(parseLocalCommand('make me coffee')).toBeNull();
  });
});
