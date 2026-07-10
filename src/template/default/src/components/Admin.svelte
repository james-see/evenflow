<script lang="ts">
  import { onMount } from 'svelte';
  import { initDB, isOPFSAvailable, query, queryOne, run, exportDB, invalidateSession } from '../lib/db';
  import ImageUpload from './ImageUpload.svelte';

  type ContentType = { id: number; name: string; slug: string; fields: string };
  type ContentField = { name: string; type: 'text' | 'markdown' | 'image' | 'date' | 'boolean' };
  type Content = { id: number; type_id: number; title: string; slug: string; body: string; data: string; status: string; created_at: string };
  type Setting = { key: string; value: string };

  let ready = $state(false);
  let error = $state<string | null>(null);
  let opfs = $state(false);

  let view = $state<'content' | 'types' | 'media' | 'settings'>('content');
  let selectedTypeId = $state<number | null>(null);
  let editingContent = $state<Content | null>(null);
  let creatingContent = $state(false);
  let newTitle = $state('');
  let newBody = $state('');
  let newImageIds = $state<number[]>([]);

  let contentTypes = $state<ContentType[]>([]);
  let contentList = $state<Content[]>([]);
  let settingsList = $state<Setting[]>([]);
  let typeCounts = $state<Record<number, number>>({});
  let statusMsg = $state('');

  let selectedImageId = $state<number | null>(null);
  let creatingType = $state(false);
  let newTypeName = $state('');
  let newTypeSlug = $state('');
  let newTypeFields = $state<ContentField[]>([{ name: 'title', type: 'text' }, { name: 'body', type: 'markdown' }]);

  function attachNewImage(id: number) {
    if (!newImageIds.includes(id)) {
      newImageIds = [...newImageIds, id];
    }
  }

  function detachNewImage(id: number) {
    newImageIds = newImageIds.filter((i) => i !== id);
  }

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
    newImageIds = [];
  }

  function getData(content: Content): { images: number[] } {
    try {
      const parsed = JSON.parse(content.data || '{}');
      return { images: Array.isArray(parsed.images) ? parsed.images : [] };
    } catch {
      return { images: [] };
    }
  }

  function setDataImages(content: Content, images: number[]): Content {
    try {
      const parsed = JSON.parse(content.data || '{}');
      parsed.images = images;
      return { ...content, data: JSON.stringify(parsed) };
    } catch {
      return { ...content, data: JSON.stringify({ images }) };
    }
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
        'INSERT INTO content (type_id, title, slug, body, data, status) VALUES (?, ?, ?, ?, ?, ?)',
        [selectedTypeId, newTitle, slug, newBody, JSON.stringify({ images: newImageIds }), 'published'],
      );
      creatingContent = false;
      newTitle = '';
      newBody = '';
      newImageIds = [];
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
        "UPDATE content SET title = ?, body = ?, data = ?, updated_at = datetime('now') WHERE id = ?",
        [editingContent.title, editingContent.body, editingContent.data, editingContent.id],
      );
      editingContent = null;
      statusMsg = 'Content saved!';
      await refresh();
    } catch (e) {
      statusMsg = `Error: ${e instanceof Error ? e.message : String(e)}`;
      console.error('Update error:', e);
    }
  }

  function addEditingImage(id: number) {
    if (!editingContent) return;
    const data = getData(editingContent);
    if (!data.images.includes(id)) {
      editingContent = setDataImages(editingContent, [...data.images, id]);
    }
  }

  function removeEditingImage(id: number) {
    if (!editingContent) return;
    const data = getData(editingContent);
    editingContent = setDataImages(editingContent, data.images.filter((i) => i !== id));
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

  function getTypeFields(ct: ContentType): ContentField[] {
    try {
      const parsed = JSON.parse(ct.fields || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function addTypeField() {
    newTypeFields = [...newTypeFields, { name: '', type: 'text' }];
  }

  function removeTypeField(index: number) {
    newTypeFields = newTypeFields.filter((_, i) => i !== index);
  }

  function updateTypeField(index: number, patch: Partial<ContentField>) {
    newTypeFields = newTypeFields.map((f, i) => i === index ? { ...f, ...patch } : f);
  }

  function slugify(input: string): string {
    return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'type';
  }

  function startCreateType() {
    creatingType = true;
    newTypeName = '';
    newTypeSlug = '';
    newTypeFields = [{ name: 'title', type: 'text' }, { name: 'body', type: 'markdown' }];
  }

  async function saveNewType() {
    if (!newTypeName.trim()) {
      statusMsg = 'Content type name is required';
      return;
    }
    const slug = newTypeSlug.trim() || slugify(newTypeName);
    const validFields = newTypeFields.filter((f) => f.name.trim());
    if (validFields.length === 0) {
      statusMsg = 'At least one field is required';
      return;
    }
    try {
      await run(
        'INSERT INTO content_types (name, slug, fields) VALUES (?, ?, ?)',
        [newTypeName.trim(), slug, JSON.stringify(validFields)],
      );
      creatingType = false;
      statusMsg = 'Content type created!';
      await refresh();
      view = 'content';
    } catch (e) {
      statusMsg = `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  async function deleteType(id: number) {
    if (!confirm('Delete this content type? All associated content will be removed.')) return;
    try {
      await run('DELETE FROM content_types WHERE id = ?', [id]);
      if (selectedTypeId === id) selectedTypeId = null;
      statusMsg = 'Content type deleted';
      await refresh();
    } catch (e) {
      statusMsg = `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  async function logout() {
    const token = localStorage.getItem('evenflow_token');
    if (token) {
      try { await invalidateSession(token); } catch (_) {}
    }
    localStorage.removeItem('evenflow_token');
    localStorage.removeItem('evenflow_user');
    window.location.href = '/login';
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
  <div class="mb-4 flex items-center justify-between">
    <div class="flex items-center gap-2 text-xs text-slate-500">
      <span class="inline-flex h-2 w-2 rounded-full {opfs ? 'bg-green-500' : 'bg-yellow-500'}"></span>
      {opfs ? 'OPFS active — content saved to browser' : 'In-memory — data lost on refresh'}
    </div>
    <button class="text-sm text-slate-500 hover:text-slate-800" onclick={logout}>Log out</button>
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
      class="px-4 py-2 text-sm font-medium {view === 'media' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}"
      onclick={() => view = 'media'}
    >Media</button>
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
              <div class="card p-3">
                <p class="label mb-2">Images — click an image to attach</p>
                <ImageUpload selectable onSelect={attachNewImage} />
                {#if newImageIds.length > 0}
                  <div class="mt-2 flex flex-wrap gap-2">
                    {#each newImageIds as id}
                      <span class="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-700">
                        #{id}
                        <button class="text-indigo-900 hover:text-red-600" onclick={() => detachNewImage(id)}>×</button>
                      </span>
                    {/each}
                  </div>
                {/if}
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
              <div class="card p-3">
                <p class="label mb-2">Images — click an image to attach</p>
                <ImageUpload selectable onSelect={addEditingImage} />
                {#if getData(editingContent).images.length > 0}
                  <div class="mt-2 flex flex-wrap gap-2">
                    {#each getData(editingContent).images as id}
                      <span class="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-700">
                        #{id}
                        <button class="text-indigo-900 hover:text-red-600" onclick={() => removeEditingImage(id)}>×</button>
                      </span>
                    {/each}
                  </div>
                {/if}
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
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold">Content Types</h2>
        <button class="btn-primary" onclick={startCreateType}>+ New Type</button>
      </div>
      {#if creatingType}
        <div class="card">
          <h3 class="mb-4 font-semibold">New Content Type</h3>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="label" for="type-name">Name</label>
                <input id="type-name" class="input" bind:value={newTypeName} placeholder="Article" />
              </div>
              <div>
                <label class="label" for="type-slug">Slug</label>
                <input id="type-slug" class="input" bind:value={newTypeSlug} placeholder={slugify(newTypeName)} />
              </div>
            </div>
            <div class="space-y-2">
              <p class="label">Fields</p>
              {#each newTypeFields as field, i}
                <div class="flex items-center gap-2">
                  <input
                    class="input flex-1"
                    value={field.name}
                    placeholder="field_name"
                    oninput={(e) => updateTypeField(i, { name: e.currentTarget.value })}
                  />
                  <select
                    class="input w-36"
                    value={field.type}
                    onchange={(e) => updateTypeField(i, { type: e.currentTarget.value as ContentField['type'] })}
                  >
                    <option value="text">Text</option>
                    <option value="markdown">Markdown</option>
                    <option value="image">Image</option>
                    <option value="date">Date</option>
                    <option value="boolean">Boolean</option>
                  </select>
                  <button class="text-sm text-red-600 hover:text-red-700" onclick={() => removeTypeField(i)}>×</button>
                </div>
              {/each}
              <button class="btn-secondary text-xs" onclick={addTypeField}>+ Add field</button>
            </div>
            <div class="flex gap-2">
              <button class="btn-primary" onclick={saveNewType}>Create Type</button>
              <button class="btn-secondary" onclick={() => creatingType = false}>Cancel</button>
            </div>
          </div>
        </div>
      {/if}
      {#each contentTypes as ct}
        <div class="card">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">{ct.name}</p>
              <p class="text-sm text-slate-500">/{ct.slug}</p>
              <p class="text-xs text-slate-400">
                {getTypeFields(ct).length} field{getTypeFields(ct).length === 1 ? '' : 's'}
                ({getTypeFields(ct).map(f => f.name).join(', ')})
              </p>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-xs text-slate-400">{typeCounts[ct.id] ?? 0} entries</span>
              {#if ct.slug !== 'posts'}
                <button class="text-xs text-red-600 hover:text-red-700" onclick={() => deleteType(ct.id)}>Delete</button>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>

  {:else if view === 'media'}
    <div class="space-y-4">
      <h2 class="text-lg font-semibold">Media Library</h2>
      <ImageUpload />
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