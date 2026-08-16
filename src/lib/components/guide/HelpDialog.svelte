<script lang="ts">
  // Help window. On the start page it shows only the guide; in the editor it
  // has a second tab with the keyboard shortcuts, which used to be a separate
  // overlay behind the "?" key.

  import type { GuideSection } from '$lib/data/guideContent';
  import { guideCopy } from '$lib/data/guideContent';
  import { getGuideLang, setGuideLang } from '$lib/stores/guide.svelte';
  import GuidePanel from './GuidePanel.svelte';
  import ShortcutsPanel from './ShortcutsPanel.svelte';

  let {
    open = $bindable(false),
    tab = $bindable<'guide' | 'shortcuts'>('guide'),
    sections,
    showShortcuts = false,
    onRestartTour
  }: {
    open?: boolean;
    tab?: 'guide' | 'shortcuts';
    sections: GuideSection[];
    showShortcuts?: boolean;
    onRestartTour?: () => void;
  } = $props();

  let lang = $derived(getGuideLang());
  let ui = $derived(guideCopy(lang).ui);
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      open = false;
    }
  }}
/>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-[9990] p-4"
    onclick={() => (open = false)}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-label={ui.helpTitle}
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
        <h2 class="text-lg font-bold text-slate-800">{ui.helpTitle}</h2>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1 mr-1">
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
          <button
            class="text-gray-400 hover:text-gray-600 text-xl leading-none"
            onclick={() => (open = false)}
            aria-label={ui.close}>✕</button
          >
        </div>
      </div>

      <!-- Tabs -->
      {#if showShortcuts}
        <div class="flex border-b border-gray-100 px-6">
          <button
            class="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors {tab === 'guide'
              ? 'text-slate-800 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-600'}"
            onclick={() => (tab = 'guide')}>{ui.tabGuide}</button
          >
          <button
            class="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors {tab === 'shortcuts'
              ? 'text-slate-800 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-600'}"
            onclick={() => (tab = 'shortcuts')}>{ui.tabShortcuts}</button
          >
        </div>
      {/if}

      <!-- Body -->
      <div class="overflow-y-auto px-6 py-5">
        {#if tab === 'shortcuts' && showShortcuts}
          <ShortcutsPanel />
        {:else}
          <GuidePanel {sections} />
        {/if}
      </div>

      <!-- Footer -->
      <div class="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
        {#if onRestartTour}
          <button
            class="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1.5"
            onclick={() => {
              open = false;
              onRestartTour?.();
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              ><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" /></svg
            >
            {ui.restartTour}
          </button>
        {:else}
          <span></span>
        {/if}
        <button
          class="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
          onclick={() => (open = false)}>{ui.close}</button
        >
      </div>
    </div>
  </div>
{/if}
