<script lang="ts">
  import { onMount } from 'svelte';
  import { initDB, query } from '../lib/db';

  let ready = $state(false);
  let posts = $state<{ id: number; title: string; slug: string; body: string; status: string; created_at: string }[]>([]);

  onMount(async () => {
    try {
      await initDB();
      posts = await query(
        `SELECT c.id, c.title, c.slug, c.body, c.status, c.created_at
         FROM content c JOIN content_types ct ON c.type_id = ct.id
         WHERE ct.slug = 'posts'
         ORDER BY c.created_at DESC`,
      );
      ready = true;
    } catch {
      ready = true;
    }
  });

  function formatDate(d: string): string {
    return new Date(d + 'Z').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
</script>

{#if !ready}
  <div class="flex items-center gap-2 text-slate-400">
    <div class="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"></div>
  </div>
{:else}
  <div>
    <h1 class="text-2xl font-bold mb-6">Posts</h1>
    {#if posts.length === 0}
      <p class="text-slate-400">No posts yet. <a href="/admin" class="text-indigo-600 hover:underline">Create some →</a></p>
    {:else}
      <div class="space-y-6">
        {#each posts as post}
          <article class="border-b border-slate-200 pb-6">
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold text-slate-900">{post.title}</h2>
              {#if post.status !== 'published'}
                <span class="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">{post.status}</span>
              {/if}
            </div>
            <p class="mt-1 text-xs text-slate-400">{formatDate(post.created_at)}</p>
            <div class="mt-3 prose prose-slate max-w-none whitespace-pre-wrap text-slate-700">{post.body}</div>
          </article>
        {/each}
      </div>
    {/if}
  </div>
{/if}