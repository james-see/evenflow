<script lang="ts">
  import { onMount } from 'svelte';
  import { initDB, isOPFSAvailable, query, queryOne, run, exportDB } from '../lib/db';

  type ContentType = { id: number; name: string; slug: string; fields: string };
  type Content = { id: number; type_id: number; title: string; slug: string; body: string; status: string; created_at: string };
  type Setting = { key: string; value: string };

  let ready = $state(false);
  let error = $state<string | null>(null);
  let opfs = $state(false);

  let view = $state<'content' | 'types' | 'settings'>('content');
  let selectedTypeId = $state<number | null>(null);
  let editingContent = $state<Content | null>(null);
  let creatingContent = $state(false);
  let newTitle = $state('');
  let newBody = $state('');

  let contentTypes = $state<ContentType[]>([]);
  let contentList = $state<Content[]>([]);
  let settingsList = $state<Setting[]>([]);
  let typeCounts = $state<Record<number, number>>({});
  let statusMsg = $state('');

  onMount(async () => {
    try {
      await initDB();
      opfs = isOPFSAvailable();
      await refresh();
      ready = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      console.error('Evenflow DB init error:', e);
    }
  });

  async function refresh() {
    contentTypes = await query<ContentType>('SELECT * FROM content_types ORDER BY name');
    if (contentTypes.length > 0 && selectedTypeId === null) {
      selectedTypeId = contentTypes[0].id;
    }
    if (selectedTypeId !== null) {
      contentList = await query<Content>(
        'SELECT * FROM content WHERE type_id = ? ORDER BY created_at DESC',
        [selectedTypeId],
      );
    }
    settingsList = await query<Setting>('SELECT * FROM settings ORDER BY key');
    // Get counts per type
    const counts: Record<number, number> = {};
    for (const ct of contentTypes) {
      const row = await queryOne<{ c: number }>('SELECT COUNT(*) as c FROM content WHERE type_id = ?', [ct.id]);
      counts[ct.id] = row?.c ?? 0;
    }
    typeCounts = counts;
  }

  function selectType(id: number) {
    selectedTypeId = id;
    editingContent = null;
    creatingContent = false;
    refresh();
  }

  function startCreate() {
    creatingContent = true;
    editingContent = null;
    newTitle = '';
    newBody = '';
  }

  async function saveNewContent() {
    if (!newTitle.trim()) {
      statusMsg = 'Title is required';
      return;
    }
    if (selectedTypeId === null) return;
    try {
      const slug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      await run(
        'INSERT INTO content (type_id, title, slug, body, status) VALUES (?, ?, ?, ?, ?)',
        [selectedTypeId, newTitle, slug, newBody, 'published'],
      );
      creatingContent = false;
      newTitle = '';
      newBody = '';
      statusMsg = 'Content published!';
      await refresh();
    } catch (e) {
      statusMsg = `Error: ${e instanceof Error ? e.message : String(e)}`;
      console.error('Save error:', e);
    }
  }

  function editContent(c: Content) {
    editingContent = { ...c };
    creatingContent = false;
  }

  async function saveContent() {
    if (!editingContent) return;
    try {
      await run(
        "UPDATE content SET title = ?, body = ?, updated_at = datetime('now') WHERE id = ?",
        [editingContent.title, editingContent.body, editingContent.id],
      );
      editingContent = null;
      statusMsg = 'Content saved!';
      await refresh();
    } catch (e) {
      statusMsg = `Error: ${e instanceof Error ? e.message : String(e)}`;
      console.error('Update error:', e);
    }
  }

  async function deleteContent(id: number) {
    if (!confirm('Delete this content?')) return;
    try {
      await run('DELETE FROM content WHERE id = ?', [id]);
      editingContent = null;
      statusMsg = 'Content deleted';
      await refresh();
    } catch (e) {
      statusMsg = `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  async function saveSetting(key: string, value: string) {
    try {
      await run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
        [key, value, value],
      );
      statusMsg = 'Setting saved';
      await refresh();
    } catch (e) {
      statusMsg = `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  async function handleExport() {
    try {
      const data = await exportDB();
      const blob = new Blob([data], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'evenflow-cms.sqlite3';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      statusMsg = `Export error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  function formatDate(d: string): string {
    try {
      return new Date(d + 'Z').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return d;
    }
  }
</script>

{#if error}
  <div class="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
    <p class="font-semibold">Database Error</p>
    <p class="mt-1 text-sm">{error}</p>
  </div>
{:else if !ready}
  <div class="flex items-center gap-2 text-slate-500">
    <div class="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"></div>
    <span>Loading SQLite WASM...</span>
  </div>
{:else}
  <div class="mb-4 flex items-center gap-2 text-xs text-slate-500">
    <span class="inline-flex h-2 w-2 rounded-full {opfs ? 'bg-green-500' : 'bg-yellow-500'}"></span>
    {opfs ? 'OPFS active — content saved to browser' : 'In-memory — data lost on refresh'}
  </div>

  {#if statusMsg}
    <div class="mb-4 rounded-lg bg-indigo-50 px-4 py-2 text-sm text-indigo-700">{statusMsg}</div>
  {/if}

  <!-- Tabs -->
  <div class="mb-6 flex gap-1 border-b border-slate-200">
    <button
      class="px-4 py-2 text-sm font-medium {view === 'content' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}"
      onclick={() => view = 'content'}
    >Content</button>
    <button
      class="px-4 py-2 text-sm font-medium {view === 'types' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}"
      onclick={() => view = 'types'}
    >Content Types</button>
    <button
      class="px-4 py-2 text-sm font-medium {view === 'settings' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}"
      onclick={() => view = 'settings'}
    >Settings</button>
  </div>

  <!-- Content View -->
  {#if view === 'content'}
    <div class="flex gap-6">
      <div class="w-48 shrink-0">
        <h3 class="mb-2 text-xs font-semibold uppercase text-slate-400">Types</h3>
        {#each contentTypes as ct}
          <button
            class="block w-full rounded-lg px-3 py-2 text-left text-sm {selectedTypeId === ct.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}"
            onclick={() => selectType(ct.id)}
          >{ct.name}</button>
        {/each}
      </div>

      <div class="flex-1">
        {#if creatingContent}
          <div class="card">
            <h2 class="mb-4 text-lg font-semibold">New Content</h2>
            <div class="space-y-4">
              <div>
                <label class="label" for="new-title">Title</label>
                <input id="new-title" class="input" bind:value={newTitle} placeholder="Hello World" />
              </div>
              <div>
                <label class="label" for="new-body">Body (Markdown)</label>
                <textarea id="new-body" class="input min-h-[200px] font-mono" bind:value={newBody} placeholder="# Hello World&#10;&#10;Write something..."></textarea>
              </div>
              <div class="flex gap-2">
                <button class="btn-primary" onclick={saveNewContent}>Publish</button>
                <button class="btn-secondary" onclick={() => creatingContent = false}>Cancel</button>
              </div>
            </div>
          </div>
        {:else if editingContent}
          <div class="card">
            <h2 class="mb-4 text-lg font-semibold">Edit Content</h2>
            <div class="space-y-4">
              <div>
                <label class="label">Title</label>
                <input class="input" bind:value={editingContent.title} />
              </div>
              <div>
                <label class="label">Body (Markdown)</label>
                <textarea class="input min-h-[200px] font-mono" bind:value={editingContent.body}></textarea>
              </div>
              <div class="flex gap-2">
                <button class="btn-primary" onclick={saveContent}>Save</button>
                <button class="btn-danger" onclick={() => deleteContent(editingContent!.id)}>Delete</button>
                <button class="btn-secondary" onclick={() => editingContent = null}>Cancel</button>
              </div>
            </div>
          </div>
        {:else}
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-semibold">Content</h2>
            <button class="btn-primary" onclick={startCreate}>+ New</button>
          </div>
          {#if contentList.length === 0}
            <p class="text-sm text-slate-400">No content yet. Click "+ New" to create your first post.</p>
          {:else}
            <div class="space-y-2">
              {#each contentList as c}
                <button
                  class="block w-full rounded-lg border border-slate-200 p-4 text-left hover:bg-slate-50"
                  onclick={() => editContent(c)}
                >
                  <div class="flex items-center justify-between">
                    <span class="font-medium text-slate-900">{c.title}</span>
                    <span class="text-xs text-slate-400">{formatDate(c.created_at)}</span>
                  </div>
                  <p class="mt-1 text-sm text-slate-500 line-clamp-1">{c.body.slice(0, 100)}</p>
                </button>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    </div>

  {:else if view === 'types'}
    <div class="space-y-4">
      <h2 class="text-lg font-semibold">Content Types</h2>
      {#each contentTypes as ct}
        <div class="card">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">{ct.name}</p>
              <p class="text-sm text-slate-500">/{ct.slug}</p>
            </div>
            <span class="text-xs text-slate-400">{typeCounts[ct.id] ?? 0} entries</span>
          </div>
        </div>
      {/each}
    </div>

  {:else if view === 'settings'}
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">Settings</h2>
        <button class="btn-secondary" onclick={handleExport}>Export DB</button>
      </div>
      {#each settingsList as s}
        <div class="card">
          <label class="label" for="setting-{s.key}">{s.key}</label>
          <input
            id="setting-{s.key}"
            class="input"
            value={s.value}
            onblur={(e) => saveSetting(s.key, e.currentTarget.value)}
          />
        </div>
      {/each}
    </div>
  {/if}
{/if}