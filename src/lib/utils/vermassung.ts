// src/lib/utils/vermassung.ts
//
// Vermassung (construction dimensioning) for the PDF export — pure math,
// no DOM, so it can be unit-tested outside the browser.
//
// Convention (matches canvasRenderer/collision):
//   - World coordinates in cm, y grows DOWNWARD (screen convention).
//   - A defined plot area is origin-centred: x ∈ [−w/2, +w/2], y ∈ [−d/2, +d/2].
//   - Nullpunkt (site zero point) = the VISUAL bottom-RIGHT corner of the plot
//     = world (+widthCm/2, +depthCm/2). Measures run X→LEFT, Y→up, i.e.
//     xM = (origin.x − wx) / 100 and yM = (origin.y − wy) / 100.
//
// Per module we report the extents of its (rotated) footprint along both
// axes: x1/y1 = where the module STARTS (edge nearer the Nullpunkt) and
// x2/y2 = where the module STOPS (far edge). On site the crew fixes the
// Nullpunkt and lays out each module with a tape measure between those marks.

import type { Floor } from '$lib/models/types';
import { footprintCorners } from './collision';
import { getCatalogItem } from './furnitureCatalog';

export interface DimEntry {
  /** 1-based index; matches the numbered marker on the plan drawing. */
  index: number;
  sku: string;
  name: string;
  /** Reference corner (footprint bbox corner nearest the Nullpunkt), world cm. */
  corner: { x: number; y: number };
  /** Module start along X (nearer edge), meters from Nullpunkt (to the left). */
  x1: number;
  /** Module end along X (farther edge — where the module stops), meters. */
  x2: number;
  /** Module start along Y (lower edge), meters from Nullpunkt (upwards). */
  y1: number;
  /** Module end along Y (upper edge — where the module stops), meters. */
  y2: number;
  /**
   * The actual footprint corner (world cm) that produces each measure —
   * extension lines on the plan start at these points so they always touch
   * the module, also for rotated footprints.
   */
  anchors: {
    x1: { x: number; y: number };
    x2: { x: number; y: number };
    y1: { x: number; y: number };
    y2: { x: number; y: number };
  };
  /** Rotation in degrees as stored on the item. */
  rotation: number;
}

export interface DimensionData {
  /** Nullpunkt in world cm (visual bottom-RIGHT of plot or module bbox). */
  origin: { x: number; y: number };
  /** True if no plot area was defined and the module bounding box was used. */
  originIsFallback: boolean;
  /** Plot rectangle in world cm (defined area, or module bbox as fallback). */
  plot: { minX: number; maxX: number; minY: number; maxY: number };
  /** One entry per placed module, sorted by x1 then y1 (reading order on site). */
  entries: DimEntry[];
}

/** Resolve effective footprint dims: per-item override → catalogue → 100 cm. */
function resolveDims(fi: {
  catalogId: string;
  width?: number;
  depth?: number;
}): { width: number; depth: number } {
  const cat = getCatalogItem(fi.catalogId);
  return {
    width: fi.width ?? cat?.width ?? 100,
    depth: fi.depth ?? cat?.depth ?? 100,
  };
}

export function computeDimensionData(floor: Floor): DimensionData {
  // --- Footprint extents of all placed modules (rotated, world cm) ---
  const items = floor.furniture.map((fi) => {
    const dims = resolveDims(fi);
    const cat = getCatalogItem(fi.catalogId);
    const corners = footprintCorners({
      x: fi.position.x,
      y: fi.position.y,
      width: dims.width,
      depth: dims.depth,
      rotation: fi.rotation,
    });
    let fpMinX = Infinity, fpMaxX = -Infinity, fpMinY = Infinity, fpMaxY = -Infinity;
    // Corners that REALISE each extreme. Tie-breaks (unrotated modules have two
    // corners per extreme): for X extents prefer the lower corner (larger world
    // y, nearer the bottom chain); for Y extents prefer the right corner
    // (larger world x, nearer the right chain) — shortest extension lines.
    const eps = 1e-6;
    let pXmax = corners[0], pXmin = corners[0], pYmax = corners[0], pYmin = corners[0];
    for (const p of corners) {
      fpMinX = Math.min(fpMinX, p.x);
      fpMaxX = Math.max(fpMaxX, p.x);
      fpMinY = Math.min(fpMinY, p.y);
      fpMaxY = Math.max(fpMaxY, p.y);
      if (p.x > pXmax.x + eps || (Math.abs(p.x - pXmax.x) <= eps && p.y > pXmax.y)) pXmax = p;
      if (p.x < pXmin.x - eps || (Math.abs(p.x - pXmin.x) <= eps && p.y > pXmin.y)) pXmin = p;
      if (p.y > pYmax.y + eps || (Math.abs(p.y - pYmax.y) <= eps && p.x > pYmax.x)) pYmax = p;
      if (p.y < pYmin.y - eps || (Math.abs(p.y - pYmin.y) <= eps && p.x > pYmin.x)) pYmin = p;
    }
    return {
      fi, name: cat?.name ?? fi.catalogId,
      fpMinX, fpMaxX, fpMinY, fpMaxY,
      pXmax, pXmin, pYmax, pYmin,
    };
  });

  // --- Plot rectangle & Nullpunkt ---
  let plot: DimensionData['plot'];
  let originIsFallback = false;
  if (floor.area) {
    plot = {
      minX: -floor.area.widthCm / 2,
      maxX: floor.area.widthCm / 2,
      minY: -floor.area.depthCm / 2,
      maxY: floor.area.depthCm / 2,
    };
  } else {
    // Fallback: bounding box of all rotated footprints.
    originIsFallback = true;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const it of items) {
      minX = Math.min(minX, it.fpMinX);
      maxX = Math.max(maxX, it.fpMaxX);
      minY = Math.min(minY, it.fpMinY);
      maxY = Math.max(maxY, it.fpMaxY);
    }
    if (!Number.isFinite(minX)) {
      minX = minY = -500;
      maxX = maxY = 500;
    }
    plot = { minX, maxX, minY, maxY };
  }
  // Visual bottom-RIGHT in y-down world coords = (maxX, maxY).
  const origin = { x: plot.maxX, y: plot.maxY };

  // --- Per module: start/end measures along both axes ---
  const entries: DimEntry[] = items.map((it) => ({
    index: 0, // assigned after sorting
    sku: it.fi.catalogId,
    name: it.name,
    // Footprint bbox corner nearest the Nullpunkt (bottom-right of the bbox).
    corner: { x: it.fpMaxX, y: it.fpMaxY },
    // X runs to the LEFT from the Nullpunkt; nearer edge = larger world x.
    x1: (origin.x - it.fpMaxX) / 100,
    x2: (origin.x - it.fpMinX) / 100,
    // Y runs UP from the Nullpunkt; nearer (lower) edge = larger world y.
    y1: (origin.y - it.fpMaxY) / 100,
    y2: (origin.y - it.fpMinY) / 100,
    // x1 = nearer edge = LARGEST world x → anchored at pXmax, etc.
    anchors: { x1: it.pXmax, x2: it.pXmin, y1: it.pYmax, y2: it.pYmin },
    rotation: it.fi.rotation,
  }));

  // Reading order for the site crew: nearest to the Nullpunkt first.
  entries.sort((a, b) => a.x1 - b.x1 || a.y1 - b.y1);
  entries.forEach((e, i) => (e.index = i + 1));

  return { origin, originIsFallback, plot, entries };
}