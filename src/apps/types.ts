import type { ComponentType, LazyExoticComponent } from 'react';
import type { AppId, SpatialWindowBounds, SpatialWindowGeometry } from '../core/types';

export type AppCapability =
  | 'storage.read'
  | 'storage.write'
  | 'files.pick'
  | 'files.open'
  | 'files.read'
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
  showInDock: boolean;
  capabilities: AppCapability[];
  defaultWindow: SpatialWindowGeometry & SpatialWindowBounds;
  Component: LazyExoticComponent<ComponentType<SpatialAppRenderProps>>;
}
