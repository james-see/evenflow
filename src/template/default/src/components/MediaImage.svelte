<script lang="ts">
  import { onMount } from 'svelte';
  import { getMedia } from '../lib/db';

  let { mediaId }: { mediaId: number } = $props();
  let url = $state('');
  let name = $state('');

  onMount(async () => {
    const media = await getMedia(mediaId);
    if (media?.data) {
      name = media.name;
      const blob = new Blob([media.data], { type: media.mime_type });
      url = URL.createObjectURL(blob);
    }
  });
</script>

{#if url}
  <img src={url} alt={name} class="rounded-lg border border-slate-200" />
{:else}
  <div class="rounded-lg border border-slate-200 bg-slate-100 h-32 animate-pulse"></div>
{/if}
