/**
 * Furniture Thumbnail Generator
 * Renders GLB models to small preview images using an offscreen Three.js renderer.
 * Cached as data URLs after first render.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { furnitureCatalog } from './furnitureCatalog';
import { thumbnailProgress, topdownVersion } from '$lib/stores/thumbnailProgress';

const CACHE_NAME = 'module-previews-v2'; // bump to invalidate stored previews
const SIZE = 128;
const TOPDOWN_MAX = 768; // px on the longer footprint side; raise to 1024 if still soft
const cache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.OrthographicCamera | null = null;

function ensureRenderer() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(SIZE, SIZE);
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);

  scene = new THREE.Scene();

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(2, 4, 3);
  scene.add(dir);
  const fill = new THREE.DirectionalLight(0xffffff, 0.4);
  fill.position.set(-2, 1, -1);
  scene.add(fill);

  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
}

const loader = new GLTFLoader();

function loadModel(file: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    loader.load(
      `/models/${file}.glb`,
      (gltf) => resolve(gltf.scene),
      undefined,
      reject
    );
  });
}

// ---- persistent cache (survives reloads; the loading screen only
// ever appears on the first cold visit) ----
async function fromPersistentCache(file: string): Promise<string | null> {
  if (typeof caches === 'undefined') return null;
  try {
    const c = await caches.open(CACHE_NAME);
    const hit = await c.match(`/__thumb__/${encodeURIComponent(file)}`);
    return hit ? await hit.text() : null;
  } catch { return null; }
}

async function toPersistentCache(file: string, dataUrl: string): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    const c = await caches.open(CACHE_NAME);
    await c.put(
      `/__thumb__/${encodeURIComponent(file)}`,
      new Response(dataUrl, { headers: { 'Content-Type': 'text/plain' } })
    );
  } catch { /* quota/unavailable: fall back to memory-only */ }
}

// ---- free geometry/materials/textures after each render (85 models
// would otherwise accumulate GPU memory on one shared renderer) ----
function disposeModel(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mats = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material ? [mesh.material] : [];
    for (const m of mats) {
      for (const v of Object.values(m)) {
        if (v instanceof THREE.Texture) v.dispose();
      }
      m.dispose();
    }
  });
}

export function getThumbnail(file: string): string | null {
  return cache.get(file) ?? null;
}

export async function generateThumbnail(file: string): Promise<string | null> {
  if (cache.has(file)) return cache.get(file)!;
  if (pending.has(file)) return pending.get(file)!;

  const promise = (async () => {
    try {
        // Reload? Serve from the persistent cache instead of re-rendering.
      const persisted = await fromPersistentCache(file);
      if (persisted) {
        cache.set(file, persisted);
        pending.delete(file);
        return persisted;
      }
      ensureRenderer();
      const model = await loadModel(file);

      // Clear scene of previous models (keep lights)
      const toRemove: THREE.Object3D[] = [];
      scene!.children.forEach(c => { if (!(c instanceof THREE.Light)) toRemove.push(c); });
      toRemove.forEach(c => scene!.remove(c));

      scene!.add(model);

      // Fit camera to model
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim === 0) return null;

      const pad = 1.3;
      const half = (maxDim * pad) / 2;
      camera!.left = -half;
      camera!.right = half;
      camera!.top = half;
      camera!.bottom = -half;
      camera!.near = 0.01;
      camera!.far = maxDim * 10;

      // Isometric-ish angle
      const dist = maxDim * 2;
      camera!.position.set(
        center.x + dist * 0.7,
        center.y + dist * 0.8,
        center.z + dist * 0.7
      );
      camera!.lookAt(center);
      camera!.updateProjectionMatrix();

      renderer!.render(scene!, camera!);
      const dataUrl = renderer!.domElement.toDataURL('image/png');

      scene!.remove(model);
      disposeModel(model);
      cache.set(file, dataUrl);
      await toPersistentCache(file, dataUrl);
      pending.delete(file);
      return dataUrl;
    } catch {
      pending.delete(file);
      return null;
    }
  })();

  pending.set(file, promise);
  return promise;
}

/** Get the GLB filename for a catalog ID (mirrors MODEL_MAP keys) */
const MODEL_FILES: Record<string, string> = {
  vt_wheelie_table: 'K00879_Wheelie_Table_300_3m_Granit',
  sofa: 'loungeDesignSofa',
  loveseat: 'loungeDesignSofa',
  chair: 'loungeChair',
  coffee_table: 'tableCoffee',
  tv_stand: 'cabinetTelevision',
  bookshelf: 'bookcaseOpen',
  side_table: 'sideTable',
  fireplace: 'toaster',
  television: 'televisionModern',
  storage: 'bookcaseClosed',
  table: 'tableCross',
  bed_queen: 'bedDouble',
  bed_twin: 'bedSingle',
  nightstand: 'cabinetBedDrawerTable',
  dresser: 'cabinetBedDrawer',
  wardrobe: 'bookcaseClosedDoors',
  stove: 'kitchenStove',
  fridge: 'kitchenFridgeLarge',
  sink_k: 'kitchenSink',
  counter: 'kitchenCabinet',
  dishwasher: 'kitchenCabinetDrawer',
  oven: 'kitchenStoveElectric',
  toilet: 'toilet',
  bathtub: 'bathtub',
  shower: 'shower',
  sink_b: 'bathroomSink',
  washer_dryer: 'washerDryerStacked',
  desk: 'tableCross',
  office_chair: 'chairDesk',
  dining_table: 'tableCross',
  dining_chair: 'chair',
  potted_plant: 'pottedPlant',
  floor_plant: 'plantSmall1',

  // Outdoor Furniture
  fire_pit: 'outdoor_campfire_stones',
  campfire: 'outdoor_campfire_logs',
  tent: 'outdoor_tent_detailedOpen',
  outdoor_sign: 'outdoor_sign',
  outdoor_pot_large: 'outdoor_pot_large',
  outdoor_pot_small: 'outdoor_pot_small',

  // Landscaping — Trees
  tree_oak: 'outdoor_tree_oak',
  tree_default: 'outdoor_tree_default',
  tree_detailed: 'outdoor_tree_detailed',
  tree_pine: 'outdoor_tree_pineRoundA',
  tree_pine_tall: 'outdoor_tree_pineTallA_detailed',
  tree_palm: 'outdoor_tree_palm',
  tree_palm_bend: 'outdoor_tree_palmBend',
  tree_palm_tall: 'outdoor_tree_palmTall',
  tree_fat: 'outdoor_tree_fat',
  tree_simple: 'outdoor_tree_simple',
  tree_thin: 'outdoor_tree_thin',
  tree_tall: 'outdoor_tree_tall',
  tree_cone: 'outdoor_tree_cone',
  tree_blocky: 'outdoor_tree_blocks',
  tree_small: 'outdoor_tree_small',

  // Landscaping — Bushes & Plants
  bush: 'outdoor_plant_bush',
  bush_detailed: 'outdoor_plant_bushDetailed',
  bush_large: 'outdoor_plant_bushLarge',
  bush_large_triangle: 'outdoor_plant_bushLargeTriangle',
  bush_small: 'outdoor_plant_bushSmall',
  bush_triangle: 'outdoor_plant_bushTriangle',
  cactus_short: 'outdoor_cactus_short',
  cactus_tall: 'outdoor_cactus_tall',
  hanging_moss: 'outdoor_hanging_moss',

  // Landscaping — Flowers
  flower_purple: 'outdoor_flower_purpleA',
  flower_red: 'outdoor_flower_redA',
  flower_yellow: 'outdoor_flower_yellowA',
  flower_purple_b: 'outdoor_flower_purpleB',
  flower_red_b: 'outdoor_flower_redB',
  flower_yellow_b: 'outdoor_flower_yellowB',
  lily: 'outdoor_lily_large',

  // Landscaping — Grass
  grass_tuft: 'outdoor_grass',
  grass_large: 'outdoor_grass_large',
  grass_leafs: 'outdoor_grass_leafs',
  grass_leafs_large: 'outdoor_grass_leafsLarge',

  // Landscaping — Rocks & Stones
  rock_large: 'outdoor_rock_largeA',
  rock_large_b: 'outdoor_rock_largeB',
  rock_tall: 'outdoor_rock_tallA',
  rock_small: 'outdoor_rock_smallA',
  rock_small_b: 'outdoor_rock_smallB',
  stone_large: 'outdoor_stone_largeA',
  stone_tall: 'outdoor_stone_tallA',

  // Landscaping — Misc
  mushroom_red: 'outdoor_mushroom_red',
  mushroom_group: 'outdoor_mushroom_redGroup',
  mushroom_tan: 'outdoor_mushroom_tan',
  log_single: 'outdoor_log',
  log_large: 'outdoor_log_large',
  log_stack: 'outdoor_log_stack',
  stump_old: 'outdoor_stump_old',
  stump_round: 'outdoor_stump_round',
  corn: 'outdoor_crops_cornStageD',
  pumpkin: 'outdoor_crop_pumpkin',
  statue_column: 'outdoor_statue_column',
  obelisk: 'outdoor_statue_obelisk',

  // Fencing
  fence_simple: 'outdoor_fence_simple',
  fence_planks: 'outdoor_fence_planks',
  fence_gate: 'outdoor_fence_gate',
  fence_corner: 'outdoor_fence_corner',
};

export function getModelFile(catalogId: string): string | null {
  // VT convention: catalogue id === SKU === "<SKU>.glb" on disk.
  // Legacy Kenney ids still resolve via MODEL_FILES; every VT SKU
  // isn't a key there, so it falls through to itself.
  return MODEL_FILES[catalogId] ?? catalogId;
}

/** Preload all thumbnails */
export function preloadThumbnails(): void {
  const files = new Set(Object.values(MODEL_FILES));
  for (const file of files) {
    generateThumbnail(file);
  }
}

/**
 * Render previews for the whole VT catalogue through a small queue,
 * reporting progress to thumbnailProgress. Idempotent per page load.
 * Cached previews (memory or persistent) resolve near-instantly, so
 * warm visits finish the "loading" in a blink.
 */
let preloadStarted = false;

export async function preloadCatalogThumbnails(): Promise<void> {
  if (preloadStarted) return;
  preloadStarted = true;
  const t0 = performance.now();

  const files = [...new Set(
    furnitureCatalog.map(f => getModelFile(f.id)).filter(Boolean) as string[]
  )];

  let done = 0;
  thumbnailProgress.set({ done: 0, total: files.length, finished: files.length === 0 });

  const CONCURRENCY = 3; // parallel GLB load+render; keeps the tab responsive
  let next = 0;
  async function worker(): Promise<void> {
    while (next < files.length) {
      const file = files[next++];
      await generateThumbnail(file); // null on failure is fine — still counts
      done++;
      thumbnailProgress.update(p => ({ ...p, done }));
    }
  }

  console.log(`[preview-benchmark] catalogue ready in ${((performance.now() - t0) / 1000).toFixed(2)} s (${files.length} models)`);
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  thumbnailProgress.update(p => ({ ...p, finished: true }));
}

// ───────────────────────────────────────────────────────────────────
// Top-down images for the 2D canvas (placed modules).
// Generated lazily: the first time a SKU is drawn on the canvas, the
// render is kicked off in the background; the canvas keeps drawing
// the vector icon until the image is ready, then swaps.
// ───────────────────────────────────────────────────────────────────

const topdownImages = new Map<string, HTMLImageElement>();
const topdownPending = new Set<string>();

/**
 * SYNCHRONOUS lookup for the canvas draw loop — never awaits.
 * Returns the image if ready; otherwise triggers background
 * generation (once) and returns null (caller draws the icon).
 */
export function getTopdownImage(file: string): HTMLImageElement | null {
  const img = topdownImages.get(file);
  if (img) return img;
  if (!topdownPending.has(file)) {
    topdownPending.add(file);
    void generateTopdown(file);
  }
  return null;
}

async function generateTopdown(file: string): Promise<void> {
  try {
    // Persistent cache first (survives reloads, like the catalogue previews)
    let dataUrl = await fromPersistentCache(`topdown:${file}`);
    if (!dataUrl) {
      dataUrl = await renderTopdown(file);
      if (!dataUrl) return; // unloadable/empty model → icon stays
      await toPersistentCache(`topdown:${file}`, dataUrl);
    }
    const img = new Image();
    img.onload = () => {
      topdownImages.set(file, img);
      topdownVersion.update((n) => n + 1); // tell the canvas to redraw
    };
    img.src = dataUrl;
  } catch {
    /* icon fallback remains */
  }
}

async function renderTopdown(file: string): Promise<string | null> {
  ensureRenderer();
  const model = await loadModel(file);

  // Clear previous models, keep lights (same pattern as generateThumbnail)
  const toRemove: THREE.Object3D[] = [];
  scene!.children.forEach((c) => { if (!(c instanceof THREE.Light)) toRemove.push(c); });
  toRemove.forEach((c) => scene!.remove(c));

  scene!.add(model);

  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  if (size.x === 0 || size.z === 0) {
    scene!.remove(model);
    disposeModel(model);
    return null;
  }

  // Frame the EXACT footprint (no padding): the square render gets
  // distorted here and un-distorted by drawImage into the w×d rect,
  // so the image aligns 1:1 with the collision box.
  camera!.left = -size.x / 2;
  camera!.right = size.x / 2;
  camera!.top = size.z / 2;
  camera!.bottom = -size.z / 2;
  camera!.near = 0.01;
  camera!.far = Math.max(size.y, 1) * 10;

  // Straight down. up = -Z maps the model's depth axis to image-vertical.
  camera!.position.set(center.x, center.y + Math.max(size.y, 1) * 2, center.z);
  camera!.up.set(0, 0, -1);
  camera!.lookAt(center);
  camera!.updateProjectionMatrix();

  // Render at high, aspect-correct resolution (the shared renderer is
  // 128² for sidebar tiles — far too small for modules that span
  // hundreds of pixels on the canvas). Long side = TOPDOWN_MAX.
  const aspect = size.x / size.z;
  const tw = aspect >= 1 ? TOPDOWN_MAX : Math.round(TOPDOWN_MAX * aspect);
  const th = aspect >= 1 ? Math.round(TOPDOWN_MAX / aspect) : TOPDOWN_MAX;
  renderer!.setSize(Math.max(tw, 32), Math.max(th, 32));

  renderer!.render(scene!, camera!);
  const dataUrl = renderer!.domElement.toDataURL('image/png');
  renderer!.setSize(SIZE, SIZE); // restore for catalogue thumbnail renders

  scene!.remove(model);
  disposeModel(model);
  return dataUrl;
}