// src/lib/utils/skateparkPdf.ts
//
// FR6/Export: skatepark plan as PDF — replaces the framework's wall-based
// exportPDF (which requires walls and thus never fires for skateparks).
// Contents: header (project, date), offscreen-rendered 2D plan (full
// boundary + buffer, independent of the on-screen viewport), plot area
// dimensions, aggregated item list (reuses FR6 logic).

import jsPDF from 'jspdf';
import type { Project, Floor } from '$lib/models/types';
import { buildItemList } from './itemListExport';
import { drawFurnitureItem, drawAreaBoundary } from './canvasRenderer';
import type { CanvasState } from './canvasInteraction';

/** Load the VT logo as a data URL (null if missing — PDF still works without it). */
async function loadLogo(): Promise<{ dataUrl: string; ratio: number } | null> {
  try {
    const res = await fetch('/branding/vt-logo.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const ratio = await new Promise<number>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.height / img.width);
      img.onerror = () => resolve(0.35);
      img.src = dataUrl;
    });
    return { dataUrl, ratio };
  } catch {
    return null;
  }
}

/**
 * Render the plan offscreen, framed to content (area boundary if defined,
 * else the modules' bounding box) plus a buffer — independent of the
 * on-screen viewport. Returns a PNG data URL.
 */
function renderPlanImage(floor: Floor, pxWidth = 2000): { dataUrl: string; ratio: number } {
  // 1) Content bounds in world cm
  let minX: number, maxX: number, minY: number, maxY: number;
  if (floor.area) {
    minX = -floor.area.widthCm / 2;
    maxX = floor.area.widthCm / 2;
    minY = -floor.area.depthCm / 2;
    maxY = floor.area.depthCm / 2;
  } else {
    minX = minY = Infinity;
    maxX = maxY = -Infinity;
    for (const f of floor.furniture) {
      const halfW = (f.width ?? 100) / 2;
      const halfD = (f.depth ?? 100) / 2;
      const r = Math.hypot(halfW, halfD); // rotation-safe radius
      minX = Math.min(minX, f.position.x - r);
      maxX = Math.max(maxX, f.position.x + r);
      minY = Math.min(minY, f.position.y - r);
      maxY = Math.max(maxY, f.position.y + r);
    }
    if (!Number.isFinite(minX)) {
      minX = minY = -500;
      maxX = maxY = 500;
    }
  }

  // 2) Buffer: 5% of the larger side, at least 1 m
  const buffer = Math.max(Math.max(maxX - minX, maxY - minY) * 0.05, 100);
  minX -= buffer;
  maxX += buffer;
  minY -= buffer;
  maxY += buffer;

  const worldW = maxX - minX;
  const worldH = maxY - minY;

  // 3) Offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = pxWidth;
  canvas.height = Math.round(pxWidth * (worldH / worldW));
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 4) CanvasState: camera at the content centre, zoom chosen to fit.
  //    wts(): x = (wx - camX) * zoom + width/2  → this framing maps
  //    [minX..maxX] exactly onto [0..canvas.width].
  const cs = {
    ctx,
    zoom: canvas.width / worldW,
    camX: (minX + maxX) / 2,
    camY: (minY + maxY) / 2,
    width: canvas.width,
    height: canvas.height,
  } as CanvasState;

  // 5) Reuse the real draw functions
  if (floor.area) drawAreaBoundary(cs, floor.area);
  for (const item of floor.furniture) {
    drawFurnitureItem(cs, item, false, false); // no selection, no conflict tint
  }

  return { dataUrl: canvas.toDataURL('image/png'), ratio: canvas.height / canvas.width };
}

export async function exportSkateparkPDF(project: Project): Promise<void> {
  const floor =
    project.floors.find((f) => f.id === project.activeFloorId) ?? project.floors[0];

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth(); // 297
  const pageH = doc.internal.pageSize.getHeight(); // 210
  const margin = 12;

  // ---- Logo (top right) ----
  const logo = await loadLogo();
  if (logo) {
    const logoW = 48; // mm
    const logoH = logoW * logo.ratio;
    doc.addImage(logo.dataUrl, 'PNG', pageW - margin - logoW, margin, logoW, logoH);
  }

  // ---- Header ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(project.name || 'Skatepark plan', margin, margin + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  const dateStr = new Date().toLocaleDateString('de-CH');
  const areaStr = floor?.area
    ? `Plot: ${(floor.area.widthCm / 100).toLocaleString('de-CH')} × ${(floor.area.depthCm / 100).toLocaleString('de-CH')} m`
    : 'Plot: not defined';
  doc.text(`${dateStr}   ·   ${areaStr}`, margin, margin + 12);
  doc.setTextColor(0);

  // ---- 2D plan (offscreen render, left ~55% of the page) ----
  const plan = floor ? renderPlanImage(floor) : null;
  const planX = margin;
  const planY = margin + 18;
  const planMaxW = pageW * 0.55;
  const planMaxH = pageH - planY - margin;
  if (plan) {
    let imgW = planMaxW;
    let imgH = imgW * plan.ratio;
    if (imgH > planMaxH) {
      imgH = planMaxH;
      imgW = imgH / plan.ratio;
    }
    doc.setDrawColor(180);
    doc.rect(planX, planY, imgW, imgH);
    doc.addImage(plan.dataUrl, 'PNG', planX, planY, imgW, imgH);
  }

  // ---- Item list (right column) ----
  const rows = buildItemList(project);
  const tableX = margin + planMaxW + 8;
  let y = planY + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Item list', tableX, y);
  y += 7;

  doc.setFontSize(8.5);
  doc.text('SKU', tableX, y);
  doc.text('Name', tableX + 22, y);
  doc.text('Qty', pageW - margin, y, { align: 'right' });
  y += 2;
  doc.setDrawColor(120);
  doc.line(tableX, y, pageW - margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  const nameMaxW = pageW - margin - (tableX + 22) - 12;
  for (const r of rows) {
    // New page if the column overflows
    if (y > pageH - margin - 10) {
      doc.addPage();
      y = margin + 6;
    }
    doc.text(r.sku, tableX, y);
    const nameLines = doc.splitTextToSize(r.name, nameMaxW);
    doc.text(nameLines[0] + (nameLines.length > 1 ? '…' : ''), tableX + 22, y);
    doc.text(String(r.quantity), pageW - margin, y, { align: 'right' });
    y += 5.5;
  }

  y += 2;
  doc.setDrawColor(120);
  doc.line(tableX, y, pageW - margin, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  const total = rows.reduce((s, r) => s + r.quantity, 0);
  doc.text('Total modules', tableX, y);
  doc.text(String(total), pageW - margin, y, { align: 'right' });

  // ---- Footer ----
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(130);
  doc.text(
    'Created with the Vertical Technik Space Planner · 3D views can be captured via the 3D screenshot button',
    margin,
    pageH - 5
  );

  doc.save(`${project.name || 'skatepark'}-plan.pdf`);
}