import type { LucideIcon } from 'lucide-react';
import {
  Shovel,
  Layers,
  Box,
  Building2,
  Columns3,
  Minus,
  Square,
  ArrowUpFromLine,
  Grid3x3,
  Fence,
  Paintbrush,
  Droplets,
  Home,
  Shield,
  DoorOpen,
  AppWindow,
  PanelTop,
  Wrench,
  Cylinder,
} from 'lucide-react';
import type { ModuleId } from '@boq/shared';

const ICONS: Record<string, LucideIcon> = {
  shovel: Shovel,
  layers: Layers,
  box: Box,
  foundation: Building2,
  columns: Columns3,
  beam: Minus,
  slab: Square,
  stairs: ArrowUpFromLine,
  brick: Grid3x3,
  block: Grid3x3,
  fence: Fence,
  paintbrush: Paintbrush,
  droplet: Droplets,
  grid: Grid3x3,
  home: Home,
  shield: Shield,
  door: DoorOpen,
  window: AppWindow,
  ceiling: PanelTop,
  steel: Wrench,
  tank: Cylinder,
};

export function moduleIcon(icon: string): LucideIcon {
  return ICONS[icon] ?? Box;
}

export function ModuleIcon({
  icon,
  className,
}: {
  icon: string;
  className?: string;
}) {
  const Icon = moduleIcon(icon);
  return <Icon className={className} />;
}

export type { ModuleId };
