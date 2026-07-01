// src/lib/utils/furnitureCatalog.ts
//
// The catalogue is generated from the product data in src/lib/data/products.json,
// which is the same data served by the mock API at /api/products (and, later, by
// the live WooCommerce REST API). Adding a module therefore means adding a .glb
// file (named <SKU>.glb) plus one entry in products.json — no code edits here.

import productsData from '$lib/data/products.json';

export interface FurnitureDef {
  id: string;
  name: string;
  category: string;
  icon: string;
  color: string;
  /** width x depth x height in cm */
  width: number;
  depth: number;
  height: number;
  /** If set, this is a 2D-only architectural symbol (not rendered in 3D) */
  symbol?: boolean;
}

/** Shape of one product as delivered by the mock/real WooCommerce API. */
interface Product {
  id: number;
  name: string;
  sku: string;
  price: string;
  categories: { id: number; name: string; slug: string }[];
  dimensions: { length: string; width: string; height: string };
  model_url: string;
}

// Fallback colour per category (used for the sidebar placeholder squares).
const CATEGORY_COLORS: Record<string, string> = {
  'Ramps & Transitions': '#ef4444',
  'Curbs, Ledges & Tables': '#f59e0b',
  'Rails': '#3b82f6',
  'Street Workout & Fitness': '#10b981',
  'Fences & Enclosures': '#a16207',
  'Foundations & Parts': '#6b7280',
  'Seating & Planters': '#16a34a',
  'Signage': '#8b5cf6',
  'Climbing & Boulder': '#0ea5e9',
  'Other': '#94a3b8',
};

// Minimum size so a module with missing/zero dimensions is still visible/placeable.
const MIN_CM = 30;

function toFurnitureDef(p: Product): FurnitureDef {
  // WooCommerce dimensions: width = left-right (X), length = depth/front-back (Z), height = up (Y)
  const width = parseFloat(p.dimensions.width) || 0;
  const depth = parseFloat(p.dimensions.length) || 0;
  const height = parseFloat(p.dimensions.height) || 0;
  const category = p.categories[0]?.name ?? 'Other';

  return {
    id: p.sku,                       // the SKU is the catalogue id (and the .glb filename)
    name: p.name,
    category,
    icon: '🛹',
    color: CATEGORY_COLORS[category] ?? '#94a3b8',
    width: Math.max(width, MIN_CM),
    depth: Math.max(depth, MIN_CM),
    height: Math.max(height, MIN_CM),
  };
}

export const furnitureCatalog: FurnitureDef[] = (productsData as Product[]).map(toFurnitureDef);

export function getCatalogItem(id: string): FurnitureDef | undefined {
  return furnitureCatalog.find(f => f.id === id);
}

export const furnitureCategories = [...new Set(furnitureCatalog.map(f => f.category))].sort();