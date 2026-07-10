<script lang="ts">
  import { onMount } from 'svelte';
  import { insertMedia, listMedia, deleteMedia, getMedia } from '../lib/db';

  type MediaItem = { id: number; name: string; mime_type: string; size: number; created_at: string };

  interface Props {
    selectable?: boolean;
    onSelect?: (id: number) => void;
  }

  let { selectable = false, onSelect }: Props = $props();

  let items = $state<MediaItem[]>([]);
  let uploading = $state(false);
  let message = $state('');
  let inputRef: HTMLInputElement | undefined = $state(undefined);

  const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

  async function refresh() {
    try {
      items = await listMedia();
    } catch (e) {
      message = `Error loading media: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  async function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      message = 'Please select an image file.';
      return;
    }
    if (file.size > MAX_BYTES) {
      message = 'Image must be under 2 MB.';
      return;
    }

    uploading = true;
    message = '';
    try {
      const buffer = await file.arrayBuffer();
      const id = await insertMedia(file.name, file.type, file.size, new Uint8Array(buffer));
      message = `Uploaded ${file.name} (#${id})`;
      if (inputRef) inputRef.value = '';
      await refresh();
      if (selectable && onSelect) onSelect(id);
    } catch (err) {
      message = `Upload error: ${err instanceof Error ? err.message : String(err)}`;
    } finally {
      uploading = false;
    }
  }

  async function remove(id: number, e: Event) {
    e.stopPropagation();
    if (!confirm('Delete this image?')) return;
    try {
      await deleteMedia(id);
      await refresh();
    } catch (e) {
      message = `Delete error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  function select(id: number) {
    if (selectable && onSelect) onSelect(id);
  }

  refresh();
</script>

{#snippet thumb(item: MediaItem)}
  {#await getMedia(item.id)}
    <div class="h-24 w-full rounded-md bg-slate-100 animate-pulse"></div>
  {:then media}
    {#if media?.data}
      <img src={URL.createObjectURL(new Blob([media.data], { type: media.mime_type }))} alt={media.name} class="h-24 w-full rounded-md object-cover" />
    {:else}
      <div class="h-24 w-full rounded-md bg-slate-200 flex items-center justify-center text-xs text-slate-400">No preview</div>
    {/if}
  {:catch err}
    <div class="h-24 w-full rounded-md bg-red-50 text-xs text-red-600 flex items-center justify-center">Error</div>
  {/await}
{/snippet}

<div class="space-y-4">
  <div class="flex items-center gap-4">
    <label class="btn-secondary cursor-pointer">
      <span>{uploading ? 'Uploading...' : 'Upload image'}</span>
      <input
        bind:this={inputRef}
        type="file"
        accept="image/*"
        class="hidden"
        disabled={uploading}
        onchange={handleFileChange}
      />
    </label>
    <span class="text-xs text-slate-400">Max 2 MB, images only</span>
  </div>

  {#if message}
    <div class="rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-700">{message}</div>
  {/if}

  {#if items.length === 0}
    <p class="text-sm text-slate-400">No images uploaded yet.</p>
  {:else}
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {#each items as item}
        <div
          class="card p-3 {selectable ? 'cursor-pointer transition hover:border-indigo-300' : ''}"
          onclick={() => select(item.id)}
          role={selectable ? 'button' : undefined}
          tabindex={selectable ? 0 : undefined}
          onkeydown={(e) => { if (selectable && (e.key === 'Enter' || e.key === ' ')) select(item.id); }}
        >
          {@render thumb(item)}
          <div class="mt-2 flex items-center justify-between">
            <span class="truncate text-xs text-slate-500" title={item.name}>{item.name}</span>
            <button type="button" class="text-xs text-red-600 hover:text-red-700" onclick={(e) => remove(item.id, e)}>Delete</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
