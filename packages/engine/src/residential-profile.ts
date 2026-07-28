/**
 * Area-derived residential assumptions (Pakistan 3–10 marla / kanal scale).
 * Reference profile calibrated against Zameen 5 marla / 2,025 sft Islamabad premium.
 */
import { round } from './constants';

export const REFERENCE_COVERED_SFT = 2025;

export interface ResidentialProfile {
  areaSft: number;
  areaM2: number;
  scale: number;
  bedrooms: number;
  bathrooms: number;
  kitchens: number;
  livingRooms: number;
  drawingRooms: number;
  /** False ceiling coverage as fraction of covered floor area */
  ceilingCoverage: number;
  /** Paintable surface area (m²) — walls + ceilings */
  paintAreaM2: number;
  /** Floor tile area (m²) */
  floorTileAreaM2: number;
  /** Wall tile area (m²) — baths & kitchen dado */
  wallTileAreaM2: number;
  /** Window glazing area (m²) */
  windowAreaM2: number;
  doorCount: number;
  wardrobeCount: number;
  kitchenCabinetCount: number;
}

export function deriveResidentialProfile(areaSft: number): ResidentialProfile {
  const area = Math.max(areaSft, 100);
  const areaM2 = area * 0.092903045;
  const scale = area / REFERENCE_COVERED_SFT;

  const bedrooms = Math.max(2, Math.round(area / 675));
  const bathrooms = Math.max(2, Math.round(area / 506));
  const kitchens = area >= 1600 ? 2 : 1;
  const livingRooms = area >= 1400 ? 2 : 1;
  const drawingRooms = area >= 1800 ? 1 : 0;

  return {
    areaSft: area,
    areaM2: round(areaM2, 2),
    scale,
    bedrooms,
    bathrooms,
    kitchens,
    livingRooms,
    drawingRooms,
    ceilingCoverage: 0.3,
    paintAreaM2: round(areaM2 * 4.25, 2),
    floorTileAreaM2: round(areaM2 * 1.12, 2),
    wallTileAreaM2: round(areaM2 * 0.4, 2),
    windowAreaM2: round(areaM2 * 0.15, 2),
    doorCount: Math.max(4, Math.round(area / 200)),
    wardrobeCount: Math.max(1, bedrooms),
    kitchenCabinetCount: kitchens,
  };
}
