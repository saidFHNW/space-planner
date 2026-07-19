// src/lib/stores/collision.ts
//
// Reactive collision state (FR5 + FR8).
// Derived from activeFloor, so it recomputes automatically whenever a module
// is added, moved, rotated, scaled or deleted — no manual triggering needed.

import { derived } from 'svelte/store';
import { activeFloor } from './project';
import { getCatalogItem } from '$lib/utils/furnitureCatalog';
import {
  checkCollisions,
  type CollisionItemInput,
  type CollisionResult,
} from '$lib/utils/collision';

const EMPTY: CollisionResult = { pairs: [], conflictIds: new Set() };

export const collisionState = derived(activeFloor, ($floor): CollisionResult => {
  if (!$floor || $floor.furniture.length < 1) return EMPTY;

  const items: CollisionItemInput[] = $floor.furniture.map((f) => {
    const cat = getCatalogItem(f.catalogId);
    return {
      id: f.id,
      catalogId: f.catalogId,
      category: cat?.category ?? 'Other',
      x: f.position.x,
      y: f.position.y,
      width: (f.width ?? cat?.width ?? 30) * Math.abs(f.scale?.x ?? 1),
      depth: (f.depth ?? cat?.depth ?? 30) * Math.abs(f.scale?.y ?? 1),
      rotation: f.rotation ?? 0,
    };
  });


  return checkCollisions(items, $floor.area);
});


