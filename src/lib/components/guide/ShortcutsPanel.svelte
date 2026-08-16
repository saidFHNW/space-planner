<script lang="ts">
  // Keyboard-shortcut reference. Moved out of the editor page unchanged when
  // the help dialog gained tabs; the house-feature entries stay gated by the
  // same flag as the rest of the interface.

  import { SHOW_HOUSE_FEATURES } from '$lib/config/features';

  let copied = $state(false);

  function copyAll() {
    const text = [
      'KEYBOARD SHORTCUTS — VT Space Planner',
      '',
      '── TOOLS ──',
      'V          Select tool',
      ...(SHOW_HOUSE_FEATURES ? ['W          Wall tool', 'D          Door tool'] : []),
      'H          Pan mode',
      ...(SHOW_HOUSE_FEATURES
        ? ['M          Measure tool', 'N          Annotate tool', 'T          Text tool']
        : []),
      'S          Toggle snap',
      '',
      '── EDIT ──',
      'Ctrl+Z     Undo',
      'Ctrl+Y     Redo',
      'Ctrl+C     Copy',
      'Ctrl+V     Paste',
      'Ctrl+A     Select all',
      'Ctrl+D     Deselect all',
      'Ctrl+S     Save project',
      'Esc        Cancel / Deselect',
      '',
      '── ELEMENTS ──',
      'R          Rotate element',
      'Del/Back   Delete selected',
      'Ctrl+L     Lock/Unlock',
      'Ctrl+G     Group selection',
      'Ctrl+⇧+G   Ungroup',
      '',
      '── VIEW ──',
      'Tab        Toggle 2D/3D',
      'F          Zoom to fit',
      'G          Toggle grid',
      'L          Toggle layers',
      '?          Show shortcuts',
      '',
      '── CANVAS ──',
      'Scroll     Zoom in/out',
      '+/-        Zoom in/out',
      'Space+Drag Pan canvas',
      ...(SHOW_HOUSE_FEATURES
        ? ['', '── WALLS ──', 'Dbl-click  Finish wall chain', 'C          Close wall loop']
        : [])
    ].join('\n');
    navigator.clipboard.writeText(text);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }
</script>

<div class="flex justify-end mb-3">
  <button
    class="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition-colors flex items-center gap-1.5"
    onclick={copyAll}
    aria-label="Copy all shortcuts"
  >
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
      ><path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      /></svg
    >
    {copied ? 'Copied ✓' : 'Copy All'}
  </button>
</div>

<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0 text-sm">
  <!-- Left column -->
  <div>
    <!-- Tools -->
    <div class="flex items-center gap-2 mb-2">
      <span class="text-xs font-bold uppercase tracking-wider text-indigo-500">Tools</span>
      <div class="flex-1 h-px bg-indigo-100"></div>
    </div>
    <div class="space-y-1.5 mb-5">
      <div class="flex justify-between"><span class="text-gray-600">Select tool</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">V</kbd></div>
      {#if SHOW_HOUSE_FEATURES}
      <div class="flex justify-between"><span class="text-gray-600">Wall tool</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">W</kbd></div>
      <div class="flex justify-between"><span class="text-gray-600">Door tool</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">D</kbd></div>
      {/if}
      <div class="flex justify-between"><span class="text-gray-600">Pan mode</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">H</kbd></div>
      {#if SHOW_HOUSE_FEATURES}
      <div class="flex justify-between"><span class="text-gray-600">Measure tool</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">M</kbd></div>
      <div class="flex justify-between"><span class="text-gray-600">Annotate tool</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">N</kbd></div>
      <div class="flex justify-between"><span class="text-gray-600">Text tool</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">T</kbd></div>
      {/if}
      <div class="flex justify-between"><span class="text-gray-600">Toggle snap</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">S</kbd></div>
    </div>

    <!-- Edit -->
    <div class="flex items-center gap-2 mb-2">
      <span class="text-xs font-bold uppercase tracking-wider text-amber-500">Edit</span>
      <div class="flex-1 h-px bg-amber-100"></div>
    </div>
    <div class="space-y-1.5 mb-5">
      <div class="flex justify-between"><span class="text-gray-600">Undo</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+Z</kbd></div>
      <div class="flex justify-between"><span class="text-gray-600">Redo</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+Y</kbd></div>
      <div class="flex justify-between"><span class="text-gray-600">Copy</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+C</kbd></div>
      <div class="flex justify-between"><span class="text-gray-600">Paste</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+V</kbd></div>
      <div class="flex justify-between"><span class="text-gray-600">Select all</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+A</kbd></div>
      <div class="flex justify-between"><span class="text-gray-600">Deselect all</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+D</kbd></div>
      <div class="flex justify-between"><span class="text-gray-600">Save project</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+S</kbd></div>
      <div class="flex justify-between"><span class="text-gray-600">Cancel / Deselect</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Esc</kbd></div>
    </div>
  </div>

  <!-- Right column -->
  <div>
    <!-- Elements -->
    <div class="flex items-center gap-2 mb-2">
      <span class="text-xs font-bold uppercase tracking-wider text-emerald-500">Elements</span>
      <div class="flex-1 h-px bg-emerald-100"></div>
    </div>
    <div class="space-y-1.5 mb-5">
      <div class="flex justify-between"><span class="text-gray-600">Rotate element</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">R</kbd></div>
      <div class="flex justify-between"><span class="text-gray-600">Delete selected</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Del</kbd></div>
      <div class="flex justify-between"><span class="text-gray-600">Lock / Unlock</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+L</kbd></div>
      <div class="flex justify-between"><span class="text-gray-600">Group selection</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+G</kbd></div>
      <div class="flex justify-between"><span class="text-gray-600">Ungroup</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+⇧+G</kbd></div>
    </div>

    <!-- View -->
    <div class="flex items-center gap-2 mb-2">
      <span class="text-xs font-bold uppercase tracking-wider text-blue-500">View</span>
      <div class="flex-1 h-px bg-blue-100"></div>
    </div>
    <div class="space-y-1.5 mb-5">
      <div class="flex justify-between"><span class="text-gray-600">Toggle 2D / 3D</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Tab</kbd></div>
      <div class="flex justify-between"><span class="text-gray-600">Zoom to fit</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">F</kbd></div>
      <div class="flex justify-between"><span class="text-gray-600">Toggle grid</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">G</kbd></div>
      <div class="flex justify-between"><span class="text-gray-600">Toggle layers</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">L</kbd></div>
      <div class="flex justify-between"><span class="text-gray-600">Show shortcuts</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">?</kbd></div>
    </div>

    <!-- Canvas -->
    <div class="flex items-center gap-2 mb-2">
      <span class="text-xs font-bold uppercase tracking-wider text-purple-500">Canvas</span>
      <div class="flex-1 h-px bg-purple-100"></div>
    </div>
    <div class="space-y-1.5 mb-5">
      <div class="flex justify-between"><span class="text-gray-600">Zoom in / out</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Scroll</kbd></div>
      <div class="flex justify-between"><span class="text-gray-600">Zoom in / out</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">+ / −</kbd></div>
      <div class="flex justify-between"><span class="text-gray-600">Pan canvas</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Space+Drag</kbd></div>
    </div>

    {#if SHOW_HOUSE_FEATURES}
    <!-- Walls -->
    <div class="flex items-center gap-2 mb-2">
      <span class="text-xs font-bold uppercase tracking-wider text-rose-500">Walls</span>
      <div class="flex-1 h-px bg-rose-100"></div>
    </div>
    <div class="space-y-1.5">
      <div class="flex justify-between"><span class="text-gray-600">Finish wall chain</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Dbl-click</kbd></div>
      <div class="flex justify-between"><span class="text-gray-600">Close wall loop</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">C</kbd></div>
    </div>
    {/if}
  </div>
</div>
