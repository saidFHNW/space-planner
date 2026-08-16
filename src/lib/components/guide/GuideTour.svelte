<script lang="ts">
  // Guided tour with a spotlight.
  //
  // The overlay is one SVG that covers the viewport. A mask cuts a hole at
  // the position of the element the current step points at, so the real
  // interface stays visible while everything else is dimmed. Because the
  // SVG itself receives the clicks, the interface underneath cannot be
  // operated by accident while the tour runs.
  //
  // A step without a target is shown as a centred card without a hole.

  import { onMount, tick } from 'svelte';
  import type { GuideStep } from '$lib/data/guideContent';
  import { guideCopy } from '$lib/data/guideContent';
  import { getGuideLang, setGuideLang } from '$lib/stores/guide.svelte';

  let { steps, onFinish }: { steps: GuideStep[]; onFinish: () => void } = $props();

  const CARD_W = 360;
  const PAD = 8;

  let idx = $state(0);
  let rect = $state<{ x: number; y: number; w: number; h: number } | null>(null);
  let vw = $state(1200);
  let vh = $state(800);
  let cardH = $state(240);

  // Optional steps whose element is not on this page are dropped once, at
  // start. Indexes are kept (not the steps themselves) so that switching the
  // language mid-tour simply swaps the text and keeps the position.
  let keptIndexes = $state<number[]>([]);

  let activeSteps = $derived(keptIndexes.map((i) => steps[i]).filter(Boolean));
  let current = $derived(activeSteps[idx]);
  let ui = $derived(guideCopy(getGuideLang()).ui);
  let lang = $derived(getGuideLang());

  async function measure() {
    await tick();
    const sel = current?.target;
    if (!sel) {
      rect = null;
      return;
    }
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) {
      rect = null;
      return;
    }
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) {
      rect = null;
      return;
    }
    rect = { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 };
  }

  onMount(() => {
    vw = window.innerWidth;
    vh = window.innerHeight;
    const kept: number[] = [];
    steps.forEach((s, i) => {
      if (s.optional && s.target && !document.querySelector(s.target)) return;
      kept.push(i);
    });
    keptIndexes = kept;
    measure();
  });

  // Re-measure whenever the step changes.
  $effect(() => {
    void idx;
    void keptIndexes;
    measure();
  });

  let pos = $derived.by(() => {
    if (!rect) {
      return { left: Math.max(12, (vw - CARD_W) / 2), top: Math.max(12, (vh - cardH) / 2) };
    }
    let left = rect.x + rect.w / 2 - CARD_W / 2;
    left = Math.max(12, Math.min(left, vw - CARD_W - 12));
    let top = rect.y + rect.h + 16;
    if (top + cardH > vh - 12) {
      const above = rect.y - cardH - 16;
      top = above >= 12 ? above : Math.max(12, vh - cardH - 12);
    }
    return { left, top };
  });

  function next() {
    if (idx < activeSteps.length - 1) idx++;
    else onFinish();
  }

  function back() {
    if (idx > 0) idx--;
  }

  function onResize() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    measure();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onFinish();
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      back();
    }
  }
</script>

<svelte:window onresize={onResize} onscroll={measure} onkeydown={onKey} />

{#if current}
  <!-- Dimmed backdrop with a hole over the highlighted element -->
  <svg class="fixed inset-0 w-full h-full z-[9998]" aria-hidden="true">
    <defs>
      <mask id="vt-guide-mask">
        <rect x="0" y="0" width="100%" height="100%" fill="white" />
        {#if rect}
          <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx="10" fill="black" />
        {/if}
      </mask>
    </defs>
    <rect x="0" y="0" width="100%" height="100%" fill="rgba(15,23,42,0.62)" mask="url(#vt-guide-mask)" />
    {#if rect}
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.w}
        height={rect.h}
        rx="10"
        fill="none"
        stroke="#3b82f6"
        stroke-width="2.5"
      />
    {/if}
  </svg>

  <!-- Step card -->
  <div
    class="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-gray-200"
    style="left:{pos.left}px; top:{pos.top}px; width:{CARD_W}px;"
    bind:clientHeight={cardH}
    role="dialog"
    aria-modal="true"
    aria-label={current.title}
  >
    <div class="px-5 pt-4 pb-2 flex items-start justify-between gap-3">
      <h2 class="text-base font-bold text-slate-800 leading-snug">{current.title}</h2>
      <div class="flex items-center gap-1 shrink-0">
        <button
          class="text-[11px] font-semibold px-1.5 py-0.5 rounded transition-colors {lang === 'de'
            ? 'bg-blue-500 text-white'
            : 'text-gray-400 hover:text-gray-600'}"
          onclick={() => setGuideLang('de')}
          aria-label="Deutsch">DE</button
        >
        <button
          class="text-[11px] font-semibold px-1.5 py-0.5 rounded transition-colors {lang === 'en'
            ? 'bg-blue-500 text-white'
            : 'text-gray-400 hover:text-gray-600'}"
          onclick={() => setGuideLang('en')}
          aria-label="English">EN</button
        >
      </div>
    </div>

    <p class="px-5 pb-4 text-sm text-gray-600 leading-relaxed">{current.body}</p>

    <div class="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
      <div class="flex items-center gap-1.5">
        {#each activeSteps as _, i}
          <div class="w-1.5 h-1.5 rounded-full {i === idx ? 'bg-blue-500' : 'bg-gray-300'}"></div>
        {/each}
        <span class="text-[11px] text-gray-400 ml-2">{ui.stepOf(idx + 1, activeSteps.length)}</span>
      </div>
      <div class="flex items-center gap-2">
        <button class="text-xs text-gray-400 hover:text-gray-600 px-1" onclick={onFinish}>{ui.skip}</button>
        {#if idx > 0}
          <button
            class="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            onclick={back}>{ui.back}</button
          >
        {/if}
        <button
          class="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-500 text-white hover:bg-blue-600"
          onclick={next}>{idx === activeSteps.length - 1 ? ui.done : ui.next}</button
        >
      </div>
    </div>
  </div>
{/if}
