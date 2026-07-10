<script lang="ts">
  import { onMount } from 'svelte';
  import { initDB, isOPFSAvailable, authLogin, verifySession } from '../lib/db';

  let ready = $state(false);
  let opfsAvailable = $state(false);
  let username = $state('');
  let password = $state('');
  let error = $state<string | null>(null);
  let loading = $state(false);
  let loggedOut = $state(false);

  onMount(async () => {
    try {
      await initDB();
      opfsAvailable = isOPFSAvailable();

      const token = localStorage.getItem('evenflow_token');
      if (token) {
        const user = await verifySession(token);
        if (user) {
          window.location.href = '/admin';
          return;
        } else {
          localStorage.removeItem('evenflow_token');
          localStorage.removeItem('evenflow_user');
          loggedOut = true;
        }
      }

      ready = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      console.error('Evenflow DB init error:', e);
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
      const result = await authLogin(username, password);

      if (result) {
        localStorage.setItem('evenflow_token', result.token);
        localStorage.setItem('evenflow_user', JSON.stringify(result.user));
        window.location.href = '/admin';
      } else {
        error = 'Invalid username or password';
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Login failed';
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-[60vh] flex items-center justify-center px-4">
  <div class="card w-full max-w-md p-8 space-y-6 shadow-lg border border-slate-200">
    <div class="text-center">
      <h1 class="text-3xl font-bold text-slate-900">Evenflow Login</h1>
      <p class="mt-2 text-sm text-slate-500">Sign in to manage your site</p>
    </div>

    {#if error}
      <div class="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
        {error}
      </div>
    {/if}

    {#if loggedOut && !username}
      <div class="rounded-md bg-yellow-50 p-3 text-sm text-yellow-700 border border-yellow-200">
        Session expired. Please sign in again.
      </div>
    {/if}

    {#if ready && !opfsAvailable}
      <div class="rounded-md bg-blue-50 p-3 text-sm text-blue-700 border border-blue-200">
        Running in non-persistent mode (OPFS unavailable). Data will reset on page reload.
      </div>
    {/if}

    <form onsubmit={(e) => { e.preventDefault(); handleLogin(); }} class="space-y-4">
      <div class="space-y-1">
        <label class="text-sm font-medium text-slate-700" for="username">Username</label>
        <input
          id="username"
          type="text"
          bind:value={username}
          class="input w-full"
          placeholder="admin"
          autocomplete="username"
          required
        />
      </div>

      <div class="space-y-1">
        <label class="text-sm font-medium text-slate-700" for="password">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          class="input w-full"
          placeholder="••••••••"
          autocomplete="current-password"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        class="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md transition-colors disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>

    <div class="text-center">
      <p class="text-xs text-slate-400">
        Default credentials: admin / admin123
      </p>
    </div>
  </div>
</div>

<style>
  .card {
    background: white;
  }
</style>
