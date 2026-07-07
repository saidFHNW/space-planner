// src/lib/utils/collision.ts
//
// FR5 (security zones) + FR8 (composition of identical modules).
//
// Rules implemented (source: interview Ivan Ofitserov, 19.03.2026; client rule on bound modules):
//  - Every module needs a free security zone around it:
//      1.5 m for "Rails" and "Curbs, Ledges & Tables", 2.0 m for all other categories.
//  - Between two modules the LARGER of their two zones applies.
//  - Two modules must never physically overlap (hard error).
//  - EXCEPTION (bound modules): two identical modules (same catalogId/SKU) placed
//    directly adjacent (gap <= BOND_TOLERANCE) count as bound to each other and are
//    exempt from the zone requirement. Deep overlap is an error even for identical modules.
//
// Geometry: 2D axis-aligned bounding boxes (footprints) in the ground plane, in cm.
// Rotation is honoured in 90° steps by swapping width/depth; arbitrary angles are
// approximated by their axis-aligned box (documented limitation / future work).

export interface CollisionItemInput {
  id: string;          // unique id of the placed item
  catalogId: string;   // SKU — identical catalogId = identical module (bond rule)
  category: string;    // product category — decides the zone size
  x: number;           // centre position X in cm
  y: number;           // centre position Y in cm
  width: number;       // footprint width in cm (before rotation)
  depth: number;       // footprint depth in cm (before rotation)
  rotation: number;    // degrees
}

export type ConflictType = 'overlap' | 'zone';

export interface ConflictPair {
  aId: string;
  bId: string;
  type: ConflictType;
  /** For 'zone': the required clearance in cm and the actual distance in cm. */
  requiredCm?: number;
  actualCm?: number;
}

export interface CollisionResult {
  pairs: ConflictPair[];
  /** Every item id involved in at least one conflict (for highlighting). */
  conflictIds: Set<string>;
}

/** Security zone per category, in cm. */
const ZONE_SMALL_CM = 150; // 1.5 m
const ZONE_DEFAULT_CM = 200; // 2.0 m
const SMALL_ZONE_CATEGORIES = new Set(['Rails', 'Curbs, Ledges & Tables']);

/** Gap (cm) up to which two identical modules count as bound together. */
export const BOND_TOLERANCE_CM = 18;

/** Penetration depth (cm) up to which touching/snapped modules are not flagged as overlap. */
const OVERLAP_TOLERANCE_CM = 18;

export function getSecurityZoneCm(category: string): number {
  return SMALL_ZONE_CATEGORIES.has(category) ? ZONE_SMALL_CM : ZONE_DEFAULT_CM;
}

interface Rect { minX: number; maxX: number; minY: number; maxY: number; }

/** Axis-aligned footprint of an item; 90°-step rotations swap width/depth. */
function footprint(it: CollisionItemInput): Rect {
  const rot = ((Math.round(it.rotation) % 360) + 360) % 360;
  const swapped = rot === 90 || rot === 270;
  const w = swapped ? it.depth : it.width;
  const d = swapped ? it.width : it.depth;
  return {
    minX: it.x - w / 2, maxX: it.x + w / 2,
    minY: it.y - d / 2, maxY: it.y + d / 2,
  };
}

/**
 * Distance between two rectangles in the plane (0 if they touch/overlap),
 * plus the penetration depth if they overlap (0 if they don't).
 */
function rectRelation(a: Rect, b: Rect): { distance: number; penetration: number } {
  const gapX = Math.max(a.minX, b.minX) - Math.min(a.maxX, b.maxX);
  const gapY = Math.max(a.minY, b.minY) - Math.min(a.maxY, b.maxY);
  // gap > 0  => separated on that axis by that amount
  // gap <= 0 => overlapping on that axis by |gap|
  if (gapX > 0 || gapY > 0) {
    const dx = Math.max(gapX, 0);
    const dy = Math.max(gapY, 0);
    return { distance: Math.hypot(dx, dy), penetration: 0 };
  }
  // Overlapping on both axes: penetration = the smaller overlap (minimal push-out).
  return { distance: 0, penetration: Math.min(-gapX, -gapY) };
}

/**
 * Checks all placed modules pairwise.
 * O(n²) — fine for the prototype scale (NFR2 targets ~20 modules; 100+ still cheap).
 */
export function checkCollisions(items: CollisionItemInput[]): CollisionResult {
  const pairs: ConflictPair[] = [];
  const conflictIds = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      const { distance, penetration } = rectRelation(footprint(a), footprint(b));

      // 1) Physical overlap is always an error (identical or not).
      if (penetration > OVERLAP_TOLERANCE_CM) {
        pairs.push({ aId: a.id, bId: b.id, type: 'overlap' });
        conflictIds.add(a.id); conflictIds.add(b.id);
        continue;
      }

      // 2) Bound modules: identical SKU, directly adjacent -> exempt from zone rule.
      if (a.catalogId === b.catalogId && distance <= BOND_TOLERANCE_CM) {
        continue;
      }

      // 3) Security zone: the larger of the two zones applies.
      const required = Math.max(getSecurityZoneCm(a.category), getSecurityZoneCm(b.category));
      if (distance < required) {
        pairs.push({
          aId: a.id, bId: b.id, type: 'zone',
          requiredCm: required, actualCm: Math.round(distance),
        });
        conflictIds.add(a.id); conflictIds.add(b.id);
      }
    }
  }

  return { pairs, conflictIds };
}
