// FR6: export the list of placed modules as SKU + name + quantity.
// Aggregates identical modules (same SKU) into one line with a count,
// so the client (Vertical Technik) can build a quote directly from it.

import type { Project } from '$lib/models/types';
import { getCatalogItem } from './furnitureCatalog';

export interface ItemListRow {
  sku: string;
  name: string;
  quantity: number;
}

/** Aggregate the active floor's placed modules by SKU. */
export function buildItemList(project: Project): ItemListRow[] {
  const floor =
    project.floors.find((f) => f.id === project.activeFloorId) ?? project.floors[0];
  if (!floor) return [];

  const counts = new Map<string, ItemListRow>();
  for (const fi of floor.furniture) {
    const existing = counts.get(fi.catalogId);
    if (existing) {
      existing.quantity += 1;
    } else {
      const cat = getCatalogItem(fi.catalogId);
      counts.set(fi.catalogId, {
        sku: fi.catalogId,
        name: cat?.name ?? fi.catalogId,
        quantity: 1,
      });
    }
  }
  // Stable, readable order: by SKU
  return [...counts.values()].sort((a, b) => a.sku.localeCompare(b.sku));
}

/** Escape one CSV field (quotes, separators, newlines). */
function csvField(v: string): string {
  return /[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/**
 * Download the item list as CSV.
 * Semicolon separator + UTF-8 BOM so Excel (Swiss/German locale)
 * opens it correctly with umlauts intact.
 */
export function exportItemListCSV(project: Project): void {
  const rows = buildItemList(project);
  const total = rows.reduce((s, r) => s + r.quantity, 0);

  const lines = [
    ['SKU', 'Name', 'Quantity'].join(';'),
    ...rows.map((r) => [csvField(r.sku), csvField(r.name), String(r.quantity)].join(';')),
    '',
    ['', 'Total modules', String(total)].join(';'),
  ];

  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${project.name || 'skatepark'}-item-list.csv`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}