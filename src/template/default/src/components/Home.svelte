<script lang="ts">
  import { onMount } from 'svelte';
  import { initDB, isOPFSAvailable, query, queryOne } from '../lib/db';
  import MediaImage from './MediaImage.svelte';

  let ready = $state(false);
  let siteName = $state('Evenflow Site');
  let latestPosts = $state<{ title: string; slug: string; body: string; data: string; created_at: string }[]>([]);

  onMount(async () => {
    try {
      await initDB();
      const name = await queryOne<{ value: string }>("SELECT value FROM settings WHERE key = 'site_name'");
      if (name) siteName = name.value;
      latestPosts = await query(
        `SELECT c.title, c.slug, c.body, c.data, c.created_at
         FROM content c JOIN content_types ct ON c.type_id = ct.id
         WHERE ct.slug = 'posts' AND c.status = 'published'
         ORDER BY c.created_at DESC LIMIT 5`,
      );
      ready = true;
    } catch {
      ready = true;
    }
  });

  function formatDate(d: string): string {
    return new Date(d + 'Z').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function excerpt(body: string): string {
    return body.slice(0, 200).replace(/[#*>\-]/g, '').trim();
  }

  function getImages(data: string): number[] {
    try {
      const parsed = JSON.parse(data || '{}');
      return Array.isArray(parsed.images) ? parsed.images.slice(0, 1) : [];
    } catch {
      return [];
    }
  }
</script>

{#if !ready}
  <div class="flex items-center gap-2 text-slate-400">
    <div class="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"></div>
  </div>
{:else}
  <div class="space-y-8">
    <div>
      <h1 class="text-3xl font-bold text-slate-900">{siteName}</h1>
      <p class="mt-2 text-slate-600">Powered by Evenflow — CMS in your browser via SQLite WASM.</p>
    </div>

    <div>
      <h2 class="mb-4 text-xl font-semibold">Latest Posts</h2>
      {#if latestPosts.length === 0}
        <p class="text-slate-400">No posts yet. Visit <a href="/admin" class="text-indigo-600 hover:underline">/admin</a> to create content.</p>
      {:else}
        <div class="space-y-4">
          {#each latestPosts as post}
            <article class="border-b border-slate-200 pb-4">
              <h3 class="font-medium text-slate-900">
                <a href="/posts" class="hover:text-indigo-600">{post.title}</a>
              </h3>
              {#if getImages(post.data).length > 0}
                <div class="mt-2 max-w-xs">
                  <MediaImage mediaId={getImages(post.data)[0]} />
                </div>
              {/if}
              <p class="mt-1 text-sm text-slate-500">{excerpt(post.body)}</p>
              <p class="mt-1 text-xs text-slate-400">{formatDate(post.created_at)}</p>
            </article>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}