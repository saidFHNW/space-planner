<script lang="ts">
  import { onMount } from 'svelte';
  import { currentProject, viewMode, selectedElementId, selectedRoomId, createDefaultProject } from '$lib/stores/project';
  import { localStore } from '$lib/services/datastore';
  import TopBar from '$lib/components/toolbar/TopBar.svelte';
  import BuildPanel from '$lib/components/sidebar/BuildPanel.svelte';
  import PropertiesPanel from '$lib/components/sidebar/PropertiesPanel.svelte';
  import LayersPanel from '$lib/components/sidebar/LayersPanel.svelte';
  import { preloadCatalogThumbnails } from '$lib/utils/furnitureThumbnails';
  import { thumbnailProgress } from '$lib/stores/thumbnailProgress';

  onMount(() => { preloadCatalogThumbnails(); });

  let showLayers = $state(false);
  import FloorPlanCanvas from '$lib/components/editor/FloorPlanCanvas.svelte';
  import AlignmentToolbar from '$lib/components/editor/AlignmentToolbar.svelte';
  import UndoHistoryPanel from '$lib/components/editor/UndoHistoryPanel.svelte';
  import CommandPalette from '$lib/components/editor/CommandPalette.svelte';
  import PrintLayout from '$lib/components/editor/PrintLayout.svelte';
  import OnboardingTooltip from '$lib/components/OnboardingTooltip.svelte';
  import { triggerTip } from '$lib/stores/onboarding.svelte';

  // --- User guide (editor) ---
  import GuideTour from '$lib/components/guide/GuideTour.svelte';
  import HelpDialog from '$lib/components/guide/HelpDialog.svelte';
  import { guideCopy } from '$lib/data/guideContent';
  import { initGuide, getGuideLang, tourSeen, markTourSeen, resetTour } from '$lib/stores/guide.svelte';

  let helpOpen = $state(false);
  let helpTab = $state<'guide' | 'shortcuts'>('guide');
  let tourOpen = $state(false);
  let tourChecked = false;
  let copy = $derived(guideCopy(getGuideLang()));

  function finishTour() {
    tourOpen = false;
    markTourSeen('editor');
  }

  function restartTour() {
    resetTour('editor');
    tourOpen = true;
  }

  let commandPaletteOpen = $state(false);
  let printOpen = $state(false);

  // Lazy-load ThreeViewer to avoid loading Three.js (~1.4MB) until 3D mode is activated
  let ThreeViewer: any = $state(null);
  $effect(() => {
    if (mode === '3d' && !ThreeViewer) {
      import('$lib/components/viewer3d/ThreeViewer.svelte').then(m => { ThreeViewer = m.default; });
    }
  });

  let mode = $state<'2d' | '3d'>('2d');
  let ready = $state(false);
  let showUndoHistory = $state(false);

  // Start the guided tour once the editor is usable — that is, after the
  // project is loaded and the catalogue previews have finished generating,
  // because until then a full-screen progress overlay covers the interface.
  $effect(() => {
    if (tourChecked || !ready || !$thumbnailProgress.finished) return;
    tourChecked = true;
    initGuide();
    if (!tourSeen('editor')) tourOpen = true;
  });

  viewMode.subscribe((m) => {
    mode = m;
    if (m === '3d') {
      // Clear selection when entering 3D — start in view-only mode
      selectedElementId.set(null);
      selectedRoomId.set(null);
      // Onboarding tip for first 3D view
      triggerTip('first-3d', 200, 80);
    }
  });

  onMount(() => {
    (async () => {
      const url = new URL(window.location.href);
      const id = url.searchParams.get('id');
      if (id) {
        const project = await localStore.load(id);
        if (project) {
          currentProject.set(project);
        } else {
          const p = createDefaultProject();
          currentProject.set(p);
          await localStore.save(p);
          history.replaceState(null, '', `/editor?id=${p.id}`);
        }
      } else {
        const p = createDefaultProject();
        currentProject.set(p);
        await localStore.save(p);
        history.replaceState(null, '', `/editor?id=${p.id}`);
      }
      ready = true;
    })();

    // Auto-save on every project change (debounced)
    let saveTimeout: ReturnType<typeof setTimeout>;
    const unsub = currentProject.subscribe((p) => {
      if (!p) return;
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => localStore.save(p), 500);
    });
    return () => { unsub(); clearTimeout(saveTimeout); };
  });
</script>

<svelte:window on:keydown={(e) => { if (e.key === 'p' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); printOpen = true; } if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !e.ctrlKey && !e.metaKey && (e.target as HTMLElement)?.tagName !== 'INPUT' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA')) { e.preventDefault(); commandPaletteOpen = !commandPaletteOpen; } if (e.key === '?' && !e.ctrlKey && !e.metaKey && !tourOpen) { helpTab = 'shortcuts'; helpOpen = !helpOpen; e.preventDefault(); } if (e.key === 'l' && !e.ctrlKey && !e.metaKey && !e.altKey && (e.target as HTMLElement)?.tagName !== 'INPUT') { showLayers = !showLayers; } }} />

{#if ready}
  <div class="h-screen flex flex-col overflow-hidden">
    <TopBar />
    <div class="flex flex-1 overflow-hidden">
      {#if mode === '2d'}
        <BuildPanel />
      {/if}
      <div class="flex-1 min-w-0 relative">
        {#if mode === '2d'}
          <FloorPlanCanvas />
          <AlignmentToolbar />
        {:else}
          {#if ThreeViewer}
            <ThreeViewer />
          {:else}
            <div class="flex items-center justify-center h-full text-slate-400">Loading 3D viewer…</div>
          {/if}
        {/if}
      </div>
      {#if showLayers && mode === '2d'}
        <LayersPanel />
      {/if}
      <PropertiesPanel is3D={mode === '3d'} />
    </div>
  </div>

  <!-- Layers toggle button -->
  {#if mode === '2d'}
    <button
      class="fixed bottom-4 left-14 w-8 h-8 rounded-full shadow-lg hover:bg-slate-600 transition-colors z-50 text-sm"
      class:bg-blue-600={showLayers}
      class:text-white={showLayers}
      class:bg-slate-700={!showLayers}
      class:text-gray-300={!showLayers}
      onclick={() => showLayers = !showLayers}
      title="Layers Panel (L)"
      aria-label="Toggle Layers Panel"
    >🗂</button>
  {/if}

  <!-- Undo History toggle button -->
  <button
    class="fixed bottom-4 left-24 w-8 h-8 rounded-full shadow-lg hover:bg-slate-600 transition-colors z-50 text-sm"
    class:bg-blue-600={showUndoHistory}
    class:text-white={showUndoHistory}
    class:bg-slate-700={!showUndoHistory}
    class:text-gray-300={!showUndoHistory}
    onclick={() => showUndoHistory = !showUndoHistory}
    title="Undo History"
    aria-label="Toggle Undo History"
  >⟲</button>

  <UndoHistoryPanel bind:visible={showUndoHistory} />

  <!-- Help button: opens the user guide; the ? key jumps to the shortcuts tab -->
  <button
    class="fixed bottom-4 left-4 w-8 h-8 rounded-full bg-slate-700 text-white text-sm font-bold shadow-lg hover:bg-slate-600 transition-colors z-50"
    data-guide="editor-help"
    onclick={() => { helpTab = 'guide'; helpOpen = !helpOpen; }}
    title={copy.ui.helpTitle}
    aria-label={copy.ui.helpTitle}
  >?</button>

  <HelpDialog bind:open={helpOpen} bind:tab={helpTab} sections={copy.panelEditor} showShortcuts onRestartTour={restartTour} />

  {#if tourOpen}
    <GuideTour steps={copy.tourEditor} onFinish={finishTour} />
  {/if}

  <CommandPalette bind:open={commandPaletteOpen} />
  <PrintLayout bind:open={printOpen} />
  <OnboardingTooltip />
{:else}
  <div class="h-screen flex items-center justify-center">
    <p class="text-gray-400">Loading...</p>
  </div>
{/if}

{#if !$thumbnailProgress.finished}
  <div class="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center gap-4">
    <div class="text-sm font-medium text-gray-700">
      Loading catalogue… {$thumbnailProgress.done} / {$thumbnailProgress.total}
    </div>
    <div class="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        class="h-full bg-blue-500 transition-all duration-200"
        style="width:{$thumbnailProgress.total
          ? ($thumbnailProgress.done / $thumbnailProgress.total) * 100
          : 0}%"
      ></div>
    </div>
  </div>
{/if}