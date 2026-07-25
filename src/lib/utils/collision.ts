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
// Geometry: 2D ORIENTED bounding boxes (footprints) in the ground plane, in cm.
// Rotation is honoured at any angle:
//  - overlap test + penetration depth via the Separating Axis Theorem (SAT),
//  - clearance between separated modules via minimum segment-segment distance
//    between the two rectangle outlines (equivalent to the rounded-rectangle
//    zone semantics used in the 2D drawing).
// For 0/90/180/270° this reduces exactly to the previous axis-aligned behaviour,
// so the calibrated 18 cm tolerances keep their meaning.

export interface CollisionItemInput {
  id: string;          // unique id of the placed item
  catalogId: string;   // SKU — identical catalogId = identical module (bond rule)
  category: string;    // product category — decides the zone size
  x: number;           // centre position X in cm
  y: number;           // centre position Y in cm
  width: number;       // footprint width in cm (before rotation)
  depth: number;       // footprint depth in cm (before rotation)
  rotation: number;    // degrees, any angle
}

export type ConflictType = 'overlap' | 'zone' | 'boundary';

export interface ConflictPair {
  aId: string;
  bId?: string;
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

// ── Oriented-box geometry ────────────────────────────────────────────

interface Pt { x: number; y: number; }

/** The four corners of an item's rotated footprint, counter-clockwise, in cm. */
export function footprintCorners(it: {
  x: number; y: number; width: number; depth: number; rotation: number;
}): Pt[] {
  const rad = (it.rotation * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const hw = it.width / 2;
  const hd = it.depth / 2;
  const local: Pt[] = [
    { x: -hw, y: -hd },
    { x: hw, y: -hd },
    { x: hw, y: hd },
    { x: -hw, y: hd },
  ];
  return local.map((p) => ({
    x: it.x + p.x * c - p.y * s,
    y: it.y + p.x * s + p.y * c,
  }));
}

/** Shortest distance between point p and segment a-b. */
function pointSegDist(p: Pt, a: Pt, b: Pt): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  let t = len2 === 0 ? 0 : ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby));
}

/** Shortest distance between segments a1-a2 and b1-b2 (0 if they intersect). */
function segSegDist(a1: Pt, a2: Pt, b1: Pt, b2: Pt): number {
  // Proper intersection test via orientation signs
  const d = (p: Pt, q: Pt, r: Pt) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = d(b1, b2, a1);
  const d2 = d(b1, b2, a2);
  const d3 = d(a1, a2, b1);
  const d4 = d(a1, a2, b2);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return 0;
  }
  return Math.min(
    pointSegDist(a1, b1, b2),
    pointSegDist(a2, b1, b2),
    pointSegDist(b1, a1, a2),
    pointSegDist(b2, a1, a2),
  );
}

/**
 * Relation between two convex quadrilaterals:
 *  - overlapping: distance 0, penetration = SAT minimum translation depth
 *  - separated:   penetration 0, distance = min distance between their outlines
 */
function polyRelation(A: Pt[], B: Pt[]): { distance: number; penetration: number } {
  // SAT: project both polygons onto every edge normal of both polygons.
  let minOverlap = Infinity;
  for (const poly of [A, B]) {
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % poly.length];
      let nx = -(p2.y - p1.y);
      let ny = p2.x - p1.x;
      const len = Math.hypot(nx, ny);
      if (len === 0) continue;
      nx /= len;
      ny /= len;
      let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
      for (const p of A) {
        const proj = p.x * nx + p.y * ny;
        if (proj < minA) minA = proj;
        if (proj > maxA) maxA = proj;
      }
      for (const p of B) {
        const proj = p.x * nx + p.y * ny;
        if (proj < minB) minB = proj;
        if (proj > maxB) maxB = proj;
      }
      const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
      if (overlap < 0) {
        // Separating axis found -> not overlapping; compute outline distance.
        let best = Infinity;
        for (let a = 0; a < A.length; a++) {
          for (let b = 0; b < B.length; b++) {
            best = Math.min(best, segSegDist(
              A[a], A[(a + 1) % A.length],
              B[b], B[(b + 1) % B.length],
            ));
          }
        }
        return { distance: best, penetration: 0 };
      }
      if (overlap < minOverlap) minOverlap = overlap;
    }
  }
  return { distance: 0, penetration: minOverlap };
}

/**
 * Checks all placed modules pairwise.
 * O(n²) — fine for the prototype scale (NFR2 targets ~20 modules; 100+ still cheap).
 */
export function checkCollisions(
  items: CollisionItemInput[],
  area?: { widthCm: number; depthCm: number }
): CollisionResult {
  const pairs: ConflictPair[] = [];
  const conflictIds = new Set<string>();

  const corners = items.map((it) => footprintCorners(it));

  // 0) Plot boundary: every corner of the rotated footprint must lie inside the
  //    (origin-centred) area.
  if (area) {
    const bx = area.widthCm / 2, by = area.depthCm / 2;
    for (let i = 0; i < items.length; i++) {
      const outside = corners[i].some(
        (p) => p.x < -bx || p.x > bx || p.y < -by || p.y > by
      );
      if (outside) {
        pairs.push({ aId: items[i].id, type: 'boundary' });
        conflictIds.add(items[i].id);
      }
    }
  }

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      const { distance, penetration } = polyRelation(corners[i], corners[j]);

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