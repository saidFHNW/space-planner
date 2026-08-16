<script lang="ts">
  // Reference part of the guide: the same content as the tour, but readable
  // as a whole and without the spotlight. Used on the start page and as the
  // first tab of the help dialog in the editor.

  import type { GuideSection } from '$lib/data/guideContent';

  let { sections }: { sections: GuideSection[] } = $props();
</script>

<div class="space-y-6">
  {#each sections as section}
    <section>
      <div class="flex items-center gap-2 mb-2">
        <span class="text-base leading-none">{section.icon}</span>
        <h3 class="text-sm font-bold text-slate-800">{section.heading}</h3>
        <div class="flex-1 h-px bg-gray-100"></div>
      </div>
      <ul class="space-y-2 pl-1">
        {#each section.lines as line}
          <li class="flex gap-2 text-sm text-gray-600 leading-relaxed">
            <span class="text-blue-400 shrink-0 select-none">•</span>
            <span>{line}</span>
          </li>
        {/each}
      </ul>
    </section>
  {/each}
</div>
