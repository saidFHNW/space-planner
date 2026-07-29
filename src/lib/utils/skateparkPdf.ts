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
import { computeDimensionData, type DimensionData } from './vermassung';

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
function renderPlanImage(
  floor: Floor,
  pxWidth = 2000
): {
  dataUrl: string;
  ratio: number;
  /** World-cm window that the image spans (incl. buffer) — for coordinate mapping. */
  window: { minX: number; maxX: number; minY: number; maxY: number };
} {
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

  return {
    dataUrl: canvas.toDataURL('image/png'),
    ratio: canvas.height / canvas.width,
    window: { minX, maxX, minY, maxY },
  };
}

/**
 * Page 2: Vermassungsplan (construction dimensioning).
 * Nullpunkt = visual bottom-RIGHT corner of the plot = (0/0); X→left, Y→up.
 * Per module both edges are dimensioned: X1/Y1 = start (nearer the Nullpunkt),
 * X2/Y2 = end (where the module stops). The plan raster is reused; all
 * dimension graphics are drawn as PDF vectors on top, so text stays crisp.
 */
export function addVermassungPage(
  doc: jsPDF,
  floor: Floor,
  plan: ReturnType<typeof renderPlanImage>,
  dd: DimensionData
): void {
  doc.addPage();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;

  // ---- Header ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Vermassungsplan', margin, margin + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100);
  const originNote = dd.originIsFallback
    ? 'Kein Areal definiert — Nullpunkt (0/0) = untere rechte Ecke der Modul-Bounding-Box.'
    : 'Nullpunkt (0/0) = untere rechte Ecke des Areals.';
  doc.text(
    `${originNote}  Alle Masse kumulativ ab Nullpunkt, in Metern (X nach links, Y nach oben).  X1/Y1 = Modulanfang, X2/Y2 = Modulende.`,
    margin,
    margin + 10
  );
  doc.setTextColor(0);

  // ---- Plan image, leaving room for the Y chain (RIGHT) and X chain (bottom) ----
  const chainR = 16; // mm reserved right of the image for the Y dimension chain
  const imgX = margin;
  const imgY = margin + 16;
  const maxW = pageW - imgX - margin - chainR;
  // Reserve room below the chains for the coordinate table (up to 6 rows),
  // so small parks fit on one page instead of spilling one row to a new page.
  const reservedRows = Math.min(dd.entries.length, 6);
  const tableNeed = 18 + 6.3 + reservedRows * 5.2 + 4;
  const maxH = Math.min(pageH - imgY - margin - tableNeed, 132);
  let imgW = maxW;
  let imgH = imgW * plan.ratio;
  if (imgH > maxH) {
    imgH = maxH;
    imgW = imgH / plan.ratio;
  }
  doc.setDrawColor(180);
  doc.rect(imgX, imgY, imgW, imgH);
  doc.addImage(plan.dataUrl, 'PNG', imgX, imgY, imgW, imgH);

  // World cm → page mm (y-down in both, no flip needed)
  const win = plan.window;
  const px = (wx: number) => imgX + ((wx - win.minX) / (win.maxX - win.minX)) * imgW;
  const py = (wy: number) => imgY + ((wy - win.minY) / (win.maxY - win.minY)) * imgH;
  // Measure (meters from Nullpunkt) → world cm
  const wxOf = (xM: number) => dd.origin.x - xM * 100;
  const wyOf = (yM: number) => dd.origin.y - yM * 100;

  const fmt = (m: number) => m.toFixed(2);
  const plotL = px(dd.plot.minX);
  const plotR = px(dd.plot.maxX);
  const plotT = py(dd.plot.minY);
  const plotB = py(dd.plot.maxY);

  // ---- Chain baselines: X below the image, Y RIGHT of the image ----
  const yChain = imgY + imgH + 6;
  const xChain = imgX + imgW + 6;
  doc.setDrawColor(60);
  doc.setLineWidth(0.25);
  doc.line(plotL, yChain, plotR, yChain);
  doc.line(xChain, plotB, xChain, plotT);

  // ---- Extension lines (light, dashed): both edges of every module ----
  // Each line starts at the ACTUAL footprint corner that produces the measure
  // (client feedback: for rotated modules, lines anchored at the bounding box
  // floated in empty space — they must touch the module).
  doc.setDrawColor(150);
  doc.setLineWidth(0.15);
  doc.setLineDashPattern([1.2, 1.2], 0);
  for (const e of dd.entries) {
    const a = e.anchors;
    doc.line(px(a.x1.x), py(a.x1.y), px(a.x1.x), yChain); // module start → X chain
    doc.line(px(a.x2.x), py(a.x2.y), px(a.x2.x), yChain); // module end → X chain
    doc.line(px(a.y1.x), py(a.y1.y), xChain, py(a.y1.y)); // module start → Y chain
    doc.line(px(a.y2.x), py(a.y2.y), xChain, py(a.y2.y)); // module end → Y chain
  }
  doc.setLineDashPattern([], 0);

  // ---- Ticks + cumulative labels ----
  const tick = 1.4;
  doc.setDrawColor(60);
  doc.setFontSize(7);

  // X chain: unique measures (rounded to cm) incl. 0 and the plot width
  const xVals = [
    0,
    ...dd.entries.flatMap((e) => [e.x1, e.x2]),
    (dd.plot.maxX - dd.plot.minX) / 100,
  ]
    .map((v) => Math.round(v * 100) / 100)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b);
  xVals.forEach((v, i) => {
    const x = px(wxOf(v));
    doc.line(x, yChain - tick, x, yChain + tick);
    // Stagger alternate labels to reduce overlap of close measures
    doc.text(fmt(v), x, yChain + 4 + (i % 2) * 3.2, { align: 'center' });
  });

  // Y chain: unique measures incl. 0 and the plot depth (labels vertical)
  const yVals = [
    0,
    ...dd.entries.flatMap((e) => [e.y1, e.y2]),
    (dd.plot.maxY - dd.plot.minY) / 100,
  ]
    .map((v) => Math.round(v * 100) / 100)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b);
  yVals.forEach((v, i) => {
    const y = py(wyOf(v));
    doc.line(xChain - tick, y, xChain + tick, y);
    doc.text(fmt(v), xChain + 4.5 + (i % 2) * 3.2, y, {
      align: 'center',
      angle: 90,
    });
  });

  // ---- Nullpunkt marker (bottom-right) ----
  doc.setFillColor(220, 38, 38);
  doc.circle(px(dd.origin.x), py(dd.origin.y), 1.3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(220, 38, 38);
  doc.text('0/0', px(dd.origin.x) + 2.2, py(dd.origin.y) + 3.6);
  doc.setTextColor(0);

  // ---- Numbered markers at each reference corner ----
  doc.setFontSize(6.5);
  for (const e of dd.entries) {
    const cx = px(e.corner.x);
    const cy = py(e.corner.y);
    doc.setFillColor(30, 64, 175);
    doc.circle(cx, cy, 2, 'F');
    doc.setTextColor(255);
    doc.text(String(e.index), cx, cy + 0.8, { align: 'center' });
  }
  doc.setTextColor(0);

  // ---- Coordinate table (below the plan; flows to a new page if crowded) ----
  const colNr = margin;
  const colSku = margin + 10;
  const colName = margin + 42;
  const colX1 = pageW - margin - 76;
  const colX2 = pageW - margin - 58;
  const colY1 = pageW - margin - 40;
  const colY2 = pageW - margin - 22;
  const colRot = pageW - margin;
  const rowH = 5.2;

  let y = yChain + 12;
  const header = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Nr', colNr, y);
    doc.text('SKU', colSku, y);
    doc.text('Name', colName, y);
    doc.text('X1 [m]', colX1, y, { align: 'right' });
    doc.text('X2 [m]', colX2, y, { align: 'right' });
    doc.text('Y1 [m]', colY1, y, { align: 'right' });
    doc.text('Y2 [m]', colY2, y, { align: 'right' });
    doc.text('Rot [°]', colRot, y, { align: 'right' });
    y += 1.8;
    doc.setDrawColor(120);
    doc.line(margin, y, pageW - margin, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
  };

  if (y + rowH * 2 > pageH - margin) {
    doc.addPage();
    y = margin + 6;
  }
  header();

  const nameMaxW = colX1 - 20 - colName;
  for (const e of dd.entries) {
    if (y > pageH - margin - 2) {
      doc.addPage();
      y = margin + 6;
      header();
    }
    doc.text(String(e.index), colNr, y);
    doc.text(e.sku, colSku, y);
    const nameLines = doc.splitTextToSize(e.name, nameMaxW);
    doc.text(nameLines[0] + (nameLines.length > 1 ? '…' : ''), colName, y);
    doc.text(fmt(e.x1), colX1, y, { align: 'right' });
    doc.text(fmt(e.x2), colX2, y, { align: 'right' });
    doc.text(fmt(e.y1), colY1, y, { align: 'right' });
    doc.text(fmt(e.y2), colY2, y, { align: 'right' });
    doc.text(String(Math.round(e.rotation)), colRot, y, { align: 'right' });
    y += rowH;
  }
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

  // ---- Page 2: Vermassungsplan (construction dimensioning) ----
  if (plan && floor && floor.furniture.length > 0) {
    addVermassungPage(doc, floor, plan, computeDimensionData(floor));
  }

  // ---- Footer on every page ----
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(130);
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.text(
      'Created with the Vertical Technik Space Planner · 3D views can be captured via the 3D screenshot button',
      margin,
      pageH - 5
    );
    doc.text(`${p}/${pageCount}`, pageW - margin, pageH - 5, { align: 'right' });
  }

  doc.save(`${project.name || 'skatepark'}-plan.pdf`);
}