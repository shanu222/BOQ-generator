/**
 * House Template Library — JSON schema (vector geometry only).
 * Templates live in packages/geometry/templates/{plotKey}/*.json
 * Add a new file there, run `npm run templates:sync`, no app logic changes.
 */

import type { PlotSizeKey, RoomType, WallMaterial, WallStructuralType } from './types';

/** Normalized [0,1] point within the building footprint (after setback). */
export type NormPoint = [number, number];

export interface TemplateRoomDef {
  name: string;
  type: RoomType;
  /** Axis-aligned room in normalized footprint coords */
  x: number;
  y: number;
  w: number;
  h: number;
  /**
   * Optional cutout carved from this room (L-shape).
   * Coordinates are absolute within the same normalized footprint space.
   */
  cutout?: { x: number; y: number; w: number; h: number };
}

export interface TemplatePartitionDef {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness?: number;
  structuralType?: WallStructuralType;
  material?: WallMaterial;
}

export interface TemplateOpeningDef {
  /** World-normalized point near a wall */
  x: number;
  y: number;
  width?: number;
  height?: number;
  sill?: number;
}

export interface TemplateStairDef {
  x: number;
  y: number;
  w: number;
  /** Depth along plan (normalized) */
  d: number;
  steps?: number;
  rotation?: number;
}

export interface TemplateColumnDef {
  x: number;
  y: number;
  size?: number;
}

/**
 * Declarative residential house template.
 * Coordinates are normalized 0–1 within the buildable footprint (plot minus setback).
 */
export interface HouseTemplateDefinition {
  /** Unique id, e.g. "3-marla-traditional" */
  id: string;
  plotKey: Exclude<PlotSizeKey, 'custom'>;
  name: string;
  tagline: string;
  style: 'traditional' | 'modern' | 'corner' | 'family' | 'executive' | 'luxury';
  bedrooms: number;
  bathrooms: number;
  hasPorch: boolean;
  hasStair: boolean;
  hasGarage?: boolean;
  features: string[];
  /** Setback as fraction of min(plotW, plotD); default 0.045 */
  marginRatio?: number;
  /** Outer load-bearing shell (default true) */
  shell?: boolean;
  partitions: TemplatePartitionDef[];
  rooms: TemplateRoomDef[];
  doors: TemplateOpeningDef[];
  windows: TemplateOpeningDef[];
  stair?: TemplateStairDef;
  /** Explicit columns; if omitted, corners + key junctions are inferred */
  columns?: TemplateColumnDef[] | 'auto';
}

export interface TemplateStats {
  bedrooms: number;
  bathrooms: number;
  coveredAreaM2: number;
  coveredAreaSft: number;
  openAreaM2: number;
  openAreaSft: number;
  plotAreaM2: number;
  hasPorch: boolean;
  hasStair: boolean;
  hasGarage: boolean;
  roomCount: number;
}

export interface TemplateCatalogEntry {
  definition: HouseTemplateDefinition;
  /** Relative path under packages/geometry/templates */
  sourcePath: string;
}
