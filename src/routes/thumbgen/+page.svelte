<!-- src/routes/thumbgen/+page.svelte
     DEV TOOL: generates preview images for every product in products.json.
     Open http://localhost:5173/thumbgen and click Start. It renders each
     /models/<SKU>.glb twice (catalogue view + top-down view) and downloads
     two zips: thumbnails.zip and topdown.zip.
     Extract them to static/thumbnails/ and static/topdown/ respectively. -->
<script lang="ts">
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import JSZip from 'jszip';
  import products from '$lib/data/products.json';

  const SIZE = 256; // px, per image

  let running = $state(false);
  let done = $state(0);
  let currentSku = $state('');
  let failed = $state<string[]>([]);
  const total = products.length;

  function download(blob: Blob, name: string) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(a ? blob : blob);
    a.download = name;
    a.click();
  }

  async function generate() {
    running = true;
    done = 0;
    failed = [];

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(SIZE, SIZE);

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const dir = new THREE.DirectionalLight(0xffffff, 1.6);
    dir.position.set(1, 2, 1.5);
    scene.add(dir);

    const loader = new GLTFLoader();
    const zipCatalogue = new JSZip();
    const zipTopdown = new JSZip();

    for (const p of products) {
      currentSku = p.sku;
      try {
        const gltf = await loader.loadAsync(`/models/${p.sku}.glb`);
        const model = gltf.scene;
        scene.add(model);

        // Centre the model at the origin
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);

        // ── View 1: catalogue (3/4 perspective) ──
        {
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const cam = new THREE.PerspectiveCamera(35, 1, maxDim / 100, maxDim * 10);
          const dist = maxDim * 1.9;
          cam.position.set(dist, dist * 0.75, dist);
          cam.lookAt(0, 0, 0);
          renderer.render(scene, cam);
          zipCatalogue.file(`${p.sku}.png`, renderer.domElement.toDataURL('image/png').split(',')[1], { base64: true });
        }

        // ── View 2: top-down orthographic (for the 2D floor plan) ──
        // The frustum matches the footprint exactly; the square PNG is
        // "stretched" here and stretched back to width x depth on the canvas,
        // so the aspect ratio comes out correct.
        {
          const hx = (size.x / 2) * 1.02 || 1;
          const hz = (size.z / 2) * 1.02 || 1;
          const cam = new THREE.OrthographicCamera(-hx, hx, hz, -hz, 0.1, size.y * 4 + 10);
          cam.position.set(0, size.y * 2 + 5, 0);
          cam.up.set(0, 0, -1);
          cam.lookAt(0, 0, 0);
          renderer.render(scene, cam);
          zipTopdown.file(`${p.sku}.png`, renderer.domElement.toDataURL('image/png').split(',')[1], { base64: true });
        }

        // Clean up GPU memory before the next model
        scene.remove(model);
        model.traverse((o: any) => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) Array.isArray(o.material) ? o.material.forEach((m: any) => m.dispose()) : o.material.dispose();
        });
      } catch {
        failed = [...failed, p.sku];
      }
      done++;
      // Yield to the browser so the progress display updates
      await new Promise((r) => setTimeout(r, 0));
    }

    currentSku = 'Creating zip files…';
    download(await zipCatalogue.generateAsync({ type: 'blob' }), 'thumbnails.zip');
    download(await zipTopdown.generateAsync({ type: 'blob' }), 'topdown.zip');

    renderer.dispose();
    currentSku = 'Done';
    running = false;
  }
</script>

<div class="max-w-lg mx-auto mt-16 p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
  <h1 class="text-lg font-bold mb-1">Thumbnail Generator (dev tool)</h1>
  <p class="text-gray-500 mb-4">
    Renders every product in products.json to two PNGs (catalogue view + top-down view)
    and downloads them as thumbnails.zip and topdown.zip.
    Extract to <code>static/thumbnails/</code> and <code>static/topdown/</code>.
  </p>

  <button
    class="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
    disabled={running}
    onclick={generate}
  >{running ? 'Running…' : `Start (${total} models)`}</button>

  {#if done > 0}
    <div class="mt-4">
      <div class="h-2 bg-gray-100 rounded overflow-hidden">
        <div class="h-full bg-blue-500 transition-all" style="width: {(done / total) * 100}%"></div>
      </div>
      <p class="mt-1 text-gray-600">{done} / {total} — {currentSku}</p>
    </div>
  {/if}

  {#if failed.length > 0 && !running}
    <p class="mt-3 text-amber-600">
      {failed.length} model(s) skipped (no .glb file found): {failed.join(', ')}
    </p>
  {/if}
</div>
