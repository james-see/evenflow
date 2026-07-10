<script lang="ts">
  import { onMount } from 'svelte';
  import { initDB, queryOne } from '../lib/db';

  let ready = $state(false);
  let username = $state('');
  let password = $state('');
  let error = $state<string | null>(null);
  let loading = $state(false);

  onMount(async () => {
    try {
      await initDB();
      ready = true;
    } catch (e) {
      error = e instanceof Error ? e.appError : String(e);
    }
  });

  async function handleLogin() {
    if (!username || !password) {
      error = 'Please enter both username and password';
      return;
    }

    loading = true;
    error = null;

    try {
      // In a real app, we'd verify the hash. 
      // For now, we check if the user exists with this credentials in the DB.
      const user = await queryOne<{ id: number; username: string }>(
        "SELECT id FROM users WHERE username = ? AND password_hash = ?",
        [username, password]
      );

      if (user) {
        // Success! In a real app, you'd set a session cookie/token here.
        // For this local WASM version, we can use localStorage for simplicity.
        localStorage.setItem('evenflow_user', JSON.stringify(user));
        window.location.href = '/admin';
      } else {
        error = 'Invalid username or password';
      }
    } catch (e) {
      error = 'Login failed: ' + (e instanceof Error ? e.message : String(e));
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-[60vh] flex items-center justify-center px-4">
  <div class="card w-full max-w-md p-8 space-y-6 shadow-lg border border-slate-200">
    <div class="text-center">
      <h1 class="text-3xl font-bold text-slate-900">Evenflow Login</h1>
      <p class="mt-2 text-sm text-slate-500">Enter your credentials to access the CMS</p>
    </div>

    {#if error}
      <div class="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
        {error}
      </div>
    {/if}

    <form onsubmitCapture={(e) => { e.preventDefault(); handleLogin(); }} class="space-y-4">
      <div class="space-y-1">
        <label class="text-sm font-medium text-slate-700" for="username">Username</label>
        <input
          id="username"
          type="text"
          bind:value={username}
          class="input w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="admin"
          required
        />
      </div>

      <div class="space-y-1">
        <label class="text-sm font-medium text-slate-700" for="password">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          class="input w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="••••••••"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        class="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md transition-colors disabled:opacity-50"
      >
        {loading ? 'Logging in...' : 'Sign In'}
      </button>
    </form>

    <div class="text-center">
      <p class="text-xs text-slate-400">
        Don't have an account? Contact your administrator.
      </p>
    </div>
  </div>
</div>

<style>
  /* Ensure the card and input styles align with the project's design system */
  .card {
    background: white;
  }
</style>
