// src/lib/utils/skateparkTemplates.ts
//
// Starter layouts: small, conflict-free example skateparks a client can open
// and adapt instead of starting from an empty canvas.
//
// Every layout was validated against checkCollisions() (FR5/FR8) with the real
// catalogue dimensions: no overlap, no security-zone violation, all modules
// fully inside the plot area. Coordinates are in cm, the plot is centred on
// the origin (same convention as Floor.area).

import type { Project, Floor, FurnitureItem } from '$lib/models/types';

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export interface SkateparkTemplate {
  name: string;
  description: string;
  icon: string;
  /** Display string, e.g. "20 x 12 m" */
  area: string;
  create: () => Project;
}

/** Minimal placed-module helper: position in cm, rotation in degrees. */
function mod(catalogId: string, x: number, y: number, rotation = 0): FurnitureItem {
  return {
    id: uid(),
    catalogId,
    position: { x, y },
    rotation,
    scale: { x: 1, y: 1, z: 1 },
  };
}

function makeProject(
  name: string,
  areaCm: { widthCm: number; depthCm: number },
  furniture: FurnitureItem[]
): Project {
  const floorId = uid();
  const floor: Floor = {
    id: floorId,
    name: 'Ground Floor',
    level: 0,
    area: areaCm,
    walls: [],
    rooms: [],
    doors: [],
    windows: [],
    furniture,
    stairs: [],
    columns: [],
    guides: [],
    measurements: [],
    annotations: [],
    textAnnotations: [],
    groups: [],
  };
  return {
    id: uid(),
    name,
    floors: [floor],
    activeFloorId: floorId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export const skateparkTemplates: SkateparkTemplate[] = [
  {
    name: 'Street Plaza S',
    description: 'Compact street setup: wave, curb, handrail box and manual table',
    icon: '🛹',
    area: '20 x 12 m',
    create: () =>
      makeProject('Street Plaza S', { widthCm: 2000, depthCm: 1200 }, [
        mod('K02043', -600, 0),        // Street Wave 500 2.4m
        mod('K02027', -600, 400),      // Granit Curb 300 3.0m
        mod('K00536', 300, 0),         // Roof Box 600 + Handrail S
        mod('K01511', 700, -350),      // Granit Manual table 350
      ]),
  },
  {
    name: 'Mini Ramp Session',
    description: 'Microramp with wheelie table and granite curb for warm-ups',
    icon: '🛝',
    area: '16 x 14 m',
    create: () =>
      makeProject('Mini Ramp Session', { widthCm: 1600, depthCm: 1400 }, [
        mod('K02012', 0, -350),        // Microrampe 950 3.96m + Stellfuessen + Gelaender
        mod('K02076', -450, 300),      // Granite Wheelie Table round 400 3000
        mod('K02029', 350, 400),       // Granit Curb 400 3.0m
      ]),
  },
  {
    name: 'Beginner Line',
    description: 'One flowing line: wave into wheelie table, curb and rail',
    icon: '➡️',
    area: '24 x 10 m',
    create: () =>
      makeProject('Beginner Line', { widthCm: 2400, depthCm: 1000 }, [
        mod('K02043', -850, 0),        // Street Wave 500 2.4m
        mod('K00885', -200, 0),        // Granit Upgrade Wheelie Table 300 3m
        mod('K02028', 350, 0),         // Granit Curb 350 3.0m
        mod('K00536', 920, 0, 90),     // Roof Box 600 + Handrail S, rotated along the line
      ]),
  },
];