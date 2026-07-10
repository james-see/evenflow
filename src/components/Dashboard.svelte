<script lang="ts">
  import { onMount } from 'svelte';
  import { initDB, isOPFSAvailable, exportDB, importDB, closeDB } from '../lib/db/client';
  import { getDashboardStats, getServices, createService, deleteService } from '../lib/db/queries';
  import type { DashboardStats, Service } from '../lib/types';

  let ready = false;
  let error: string | null = null;
  let opfs = false;
  let stats: DashboardStats | null = null;
  let services: Service[] = [];
  let showAddForm = $state(false);
  let newService = $state({ name: '', type: '', monthly_cost: 0, region: '' });

  onMount(async () => {
    try {
      await initDB('opfs');
      opfs = isOPFSAvailable();
      refresh();
      ready = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  });

  function refresh() {
    stats = getDashboardStats();
    services = getServices();
  }

  function addService() {
    if (!newService.name) return;
    createService({
      service_id: crypto.randomUUID(),
      name: newService.name,
      type: newService.type || null,
      monthly_cost: Number(newService.monthly_cost) || 0,
      region: newService.region || null,
    });
    newService = { name: '', type: '', monthly_cost: 0, region: '' };
    showAddForm = false;
    refresh();
  }

  function handleDeleteService(id: number) {
    deleteService(id);
    refresh();
  }

  async function handleExport() {
    const data = await exportDB();
    const blob = new Blob([data], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'evenflow.sqlite3';
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatCurrency(n: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  }
</script>

{#if error}
  <div class="card border-red-800 bg-red-950/50">
    <h2 class="text-lg font-semibold text-red-400">Database Error</h2>
    <p class="mt-2 text-sm text-red-300">{error}</p>
    <p class="mt-2 text-xs text-slate-500">
      Make sure your browser supports OPFS (Chrome 111+, Firefox 111+, Safari 16.4+).
      Try a different browser or check console for details.
    </p>
  </div>
{:else if !ready}
  <div class="flex items-center gap-3 text-slate-400">
    <div class="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-evenflow-500"></div>
    <span>Initializing SQLite WASM...</span>
  </div>
{:else if stats}
  <!-- Stats Cards -->
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <div class="card">
      <p class="text-sm text-slate-400">Total Monthly Cost</p>
      <p class="mt-2 text-3xl font-bold text-white">{formatCurrency(stats.totalMonthlyCost)}</p>
    </div>
    <div class="card">
      <p class="text-sm text-slate-400">Services Tracked</p>
      <p class="mt-2 text-3xl font-bold text-white">{stats.serviceCount}</p>
    </div>
    <div class="card">
      <p class="text-sm text-slate-400">Budget Limit</p>
      <p class="mt-2 text-3xl font-bold text-white">{formatCurrency(stats.budgetLimit)}</p>
      <p class="mt-1 text-xs text-slate-500">{stats.budgetCount} budget{stats.budgetCount !== 1 ? 's' : ''}</p>
    </div>
    <div class="card">
      <p class="text-sm text-slate-400">Unacknowledged Alerts</p>
      <p class="mt-2 text-3xl font-bold text-white">{stats.alertCount}</p>
    </div>
  </div>

  <!-- OPFS status -->
  <div class="mt-4 flex items-center gap-2 text-xs text-slate-500">
    <span class="inline-flex h-2 w-2 rounded-full {opfs ? 'bg-green-500' : 'bg-yellow-500'}"></span>
    {opfs ? 'OPFS persistence active — database saved to browser storage' : 'In-memory mode — data lost on refresh (OPFS not available)'}
  </div>

  <!-- Services -->
  <div class="mt-8">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-white">Services</h2>
      <div class="flex gap-2">
        <button class="btn-secondary" onclick={handleExport}>Export DB</button>
        <button class="btn-primary" onclick={() => showAddForm = !showAddForm}>
          {showAddForm ? 'Cancel' : '+ Add Service'}
        </button>
      </div>
    </div>

    {#if showAddForm}
      <div class="card mt-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label class="label" for="svc-name">Name</label>
            <input id="svc-name" class="input" bind:value={newService.name} placeholder="my-api-server" />
          </div>
          <div>
            <label class="label" for="svc-type">Type</label>
            <input id="svc-type" class="input" bind:value={newService.type} placeholder="EC2 / GCE / etc." />
          </div>
          <div>
            <label class="label" for="svc-cost">Monthly Cost ($)</label>
            <input id="svc-cost" class="input" type="number" bind:value={newService.monthly_cost} placeholder="0" />
          </div>
          <div>
            <label class="label" for="svc-region">Region</label>
            <input id="svc-region" class="input" bind:value={newService.region} placeholder="us-east-1" />
          </div>
        </div>
        <button class="btn-primary mt-4" onclick={addService}>Save Service</button>
      </div>
    {/if}

    {#if services.length === 0}
      <div class="card mt-4 text-center text-slate-500">
        <p>No services yet. Add your first cloud service to start tracking costs.</p>
      </div>
    {:else}
      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-800 text-left text-slate-400">
              <th class="py-3 pr-4 font-medium">Name</th>
              <th class="py-3 pr-4 font-medium">Type</th>
              <th class="py-3 pr-4 font-medium">Region</th>
              <th class="py-3 pr-4 font-medium text-right">Monthly Cost</th>
              <th class="py-3 pr-4 font-medium">Status</th>
              <th class="py-3 pr-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {#each services as svc}
              <tr class="border-b border-slate-800/50">
                <td class="py-3 pr-4 text-slate-100">{svc.name ?? 'unnamed'}</td>
                <td class="py-3 pr-4 text-slate-400">{svc.type ?? '—'}</td>
                <td class="py-3 pr-4 text-slate-400">{svc.region ?? '—'}</td>
                <td class="py-3 pr-4 text-right text-slate-100">{formatCurrency(svc.monthly_cost)}</td>
                <td class="py-3 pr-4">
                  <span class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium
                    {svc.status === 'running' ? 'bg-green-950 text-green-400' : 'bg-slate-800 text-slate-400'}">
                    <span class="h-1.5 w-1.5 rounded-full {svc.status === 'running' ? 'bg-green-500' : 'bg-slate-500'}"></span>
                    {svc.status}
                  </span>
                </td>
                <td class="py-3 pr-4">
                  <button class="text-xs text-red-400 hover:text-red-300" onclick={() => handleDeleteService(svc.id)}>Delete</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
{/if}