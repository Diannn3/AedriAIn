import type { ComponentType } from 'react';
import type { AppId } from '../core/types';

export type AppCapability =
  | 'storage.read'
  | 'storage.write'
  | 'files.pick'
  | 'files.open'
  | 'map.network'
  | 'calendar.read'
  | 'calendar.write'
  | 'ai.tools';

export interface SpatialAppRenderProps {
  windowId: string;
  resourceId?: string;
}

export interface SpatialAppDefinition {
  id: AppId;
  title: string;
  icon: string;
  singleton: boolean;
  capabilities: AppCapability[];
  Component: ComponentType<SpatialAppRenderProps>;
}
