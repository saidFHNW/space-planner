# VT Space Planner

**A browser-based space planner for modular skateparks.**

Define the available plot, place modules from the Vertical Technik catalogue in a
2D top view, check them against the required safety zones, look at the result in
3D, and export an item list and a construction plan — without installing anything
and without an account.

**Live:** <https://space-planner-six.vercel.app>

---

## Background

This repository is the prototype built for the bachelor thesis *"Development and
Feasibility Evaluation of a Web-Based Space Planner for Modular Skateparks Using
Open Source Frameworks"* (FHNW School of Business, 2026) for the client
**Vertical Technik AG**.

The thesis ran in two phases. A feasibility study evaluated three open-source
floor-planning frameworks against six criteria and selected
[open3dFloorplan](https://github.com/theLodgeBots/open3dFloorplan) — mainly
because it is the only one of the three that imports the `.glb` format used by
Vertical Technik natively. The second phase adapted that framework into the
planner in this repository.

The upstream project is MIT-licensed; its licence is kept in [LICENSE](LICENSE)
and the framework is credited here and in the thesis. Everything under
"What was added" below is the work of this project.

---

## What it does

- **Plot area** — enter width and depth in metres (comma or point, up to
  500 × 500 m). Drawn as a dashed rectangle in 2D and as a ground surface in 3D.
- **Module catalogue** — 85 Vertical Technik modules with categories, search and
  preview images generated from the real 3D models.
- **Placement** — click-to-place or drag-and-drop, move by dragging, rotate by
  handle. Modules cannot be resized; they are fixed products.
- **Safety zones** — 1.5 m of clearance for `Rails` and `Curbs, Ledges & Tables`,
  2.0 m for every other category. Where two zones meet, the larger applies. Zones
  are computed on the *oriented* footprint, so they rotate with the module.
- **Bonding rule** — two modules with the same SKU placed directly against each
  other count as one composition and need no zone between them.
- **Conflict reporting** — overlaps, zone violations and modules outside the plot
  are highlighted in red and summarised in a banner. The planner warns; it never
  blocks a placement.
- **3D view** — the real GLB models, orbit/pan/zoom, a first-person walkthrough
  and a screenshot button.
- **Exports** — item list as CSV (semicolon-separated with a BOM, for Excel with
  German regional settings), a PDF with the plan and the item list plus a second
  page with the dimensioning plan (*Vermassungsplan*), and the project as JSON
  for backup and exchange.
- **In-app user guide** — a guided tour on first visit and a reopenable help
  window, in German and English.

Prices are deliberately not shown. The planner prepares an enquiry; it does not
replace a quotation.

---

## Tech stack

| | |
|---|---|
| Framework | SvelteKit 2 · Svelte 5 (runes) · TypeScript |
| 3D | Three.js |
| Styling | Tailwind CSS 4 |
| Build | Vite 7 |
| PDF / export | jsPDF, dxf-writer, jszip |
| Hosting | Vercel |
| Supporting scripts | Python 3 (trimesh) |

---

## Getting started

Requires **Node.js 20.19+** (Vite 7).

```bash
git clone https://github.com/saidFHNW/space-planner.git
cd space-planner
npm install
npm run dev
```

Then open <http://localhost:5173>.

### The 3D models are not in this repository

The 85 GLB files are Vertical Technik product data and are excluded in
`.gitignore` (`static/models/K*.glb`). Without them the application starts, but
the catalogue shows placeholders instead of previews and the 3D view is empty.

To run the planner with models, copy the delivered GLB files into
`static/models/`. The file name **must** be the SKU:

```
static/models/K00834.glb   ->   catalogue entry with "sku": "K00834"
```

That convention — *catalogue id = SKU = file name* — is the central design
decision of the project. It removes every mapping table, and it means a new
product needs one entry in `products.json` and one model file, with no source
code change.

### Scripts

```bash
npm run dev        # development server
npm run build      # production build
npm run preview    # serve the production build locally
npm run check      # svelte-check / TypeScript
```

---

## Project structure

```
src/
  routes/
    +page.svelte              start page: project list, examples, guide
    editor/+page.svelte       the planner
    api/products/+server.ts   mock API in the shape of the WooCommerce REST API
  lib/
    components/
      editor/                 2D canvas, alignment, command palette, history
      sidebar/                Area tab, catalogue (Objects), properties, layers
      toolbar/                top bar, settings, version history
      viewer3d/               Three.js viewer, material picker
      guide/                  user guide: tour, panel, shortcuts, help dialog
    config/features.ts        SHOW_HOUSE_FEATURES flag
    data/
      products.json           the product catalogue (single source of truth)
      guideContent.ts         German/English text of the in-app guide
    stores/                   project state, collision state, guide state
    utils/
      collision.ts            zones, overlaps, bonding, plot boundary
      furnitureModelLoader.ts GLB loading and rescaling
      furnitureThumbnails.ts  runtime preview generation and cache
      skateparkPdf.ts         PDF export, page 1
      vermassung.ts           dimensioning maths for PDF page 2
      skateparkTemplates.ts   the three example layouts
static/models/                GLB files, <SKU>.glb (not in git)
check_model_dims.py           audit: model bounding boxes vs. product data
patch_zero_dims.py            write measured dimensions into products.json
rename_models.py              rename delivered GLB files to their SKU
```

---

## Key concepts

**Product data is the single source of truth.** The dimensions in
`products.json` drive the footprint in the 2D plan, the collision and zone
checks, the scaling of the 3D models and the measures in the export. The quality
of the planner therefore depends directly on the quality of the product data —
which is why the audit script exists.

**Mixed model units.** The delivered GLB files are not uniform: most are exported
in millimetres, the newer granite modules in metres. `check_model_dims.py`
detects the unit per file before comparing.

**Precise bounding boxes.** The model loader uses
`Box3.setFromObject(model, true)` — the vertex-precise variant. The default
transforms each part's local box, which overestimates models containing rotated
nodes and made one curved module appear squashed. Do not change this back. The
`setFromObject(wallGroup)` calls in `ThreeViewer.svelte` are a different case and
are intentionally left as they are.

**Hide, don't delete.** The framework's house features (walls, doors, windows,
stairs, floors, house templates) are not removed but wrapped in
`SHOW_HOUSE_FEATURES` in [`src/lib/config/features.ts`](src/lib/config/features.ts).
Setting it to `true` restores the original floor-plan editor. Hiding covers not
only the visible buttons but also the keyboard shortcuts, the command palette and
the shortcuts overlay.

**Calibrated tolerances.** `BOND_TOLERANCE_CM` and `OVERLAP_TOLERANCE_CM` in
[`src/lib/utils/collision.ts`](src/lib/utils/collision.ts) are both 18 cm. The
value was calibrated: drag-and-drop cannot reliably produce smaller gaps for some
modules, and a stricter value marked intended bonds as violations.

**Projects live in the browser.** There is no server-side storage and no account.
Projects are held in the browser of the user; JSON export/import is the way to
share or back one up.

---

## Deployment

The site is deployed from a developer machine with the Vercel CLI:

```bash
npx vercel --prod
```

This is deliberate. The GLB models are git-ignored, so a Git-based deployment
would publish a build without any 3D models. The CLI uploads the local working
directory, models included. `.vercelignore` keeps `node_modules`, build output
and the pre-generated preview folders out of the upload.

---

## Maintenance

Day-to-day maintenance — adding a product, replacing a model, re-running the
audit, deploying — is documented for the client in German in
**[MAINTENANCE.md](MAINTENANCE.md)**.

---

## Status and known limitations

- **Testing is manual.** There is no automated test suite in this repository.
  Verification was done in the running application, plus the model/product-data
  audit script. Adding tests is the recommended first step of any further work.
- **The catalogue is a mock.** `/api/products` serves `products.json`, shaped
  like the client's WooCommerce REST API. The live connection is prepared but
  needs a read-only API key from the client.
- **23 of the 85 modules have provisional dimensions** measured from their model
  files, because the shop data had none. They are still to be confirmed by
  Vertical Technik.
- **First load takes about 20 seconds** while the module previews are generated
  in the browser; afterwards they come from the cache in about a second. The
  first-load time grows with the size of the catalogue.
- **Browser support** was verified on Chromium-based browsers (Chrome, Edge,
  Brave) on desktop. Tablets and weaker graphics hardware are not systematically
  covered. The 3D view needs WebGL.
- **Directional safety zones** for run-up modules are specified but not
  implemented (deliberately deferred).
- **The interface is English**; only the user guide is bilingual. A German UI
  would need a proper i18n setup.

---

## Credits

- Built on [open3dFloorplan](https://github.com/theLodgeBots/open3dFloorplan)
  by theLodgeStudio (MIT).
- Client: **Vertical Technik AG**, Frenkendorf — Paul Heuberger (CEO),
  Ivan Ofitserov (safety-zone rules), Filip Cengic (IT).
- Supervisor: Devid Montecchiari, FHNW School of Business.
- Author: Said Fakhri.

## Licence

MIT — see [LICENSE](LICENSE). The 3D models and the product data of Vertical
Technik AG are **not** covered by this licence and are not part of this
repository.
