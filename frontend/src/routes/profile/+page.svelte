<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getStats } from '$lib/api';
	import { user as userStore } from '$lib/session';
	import type { StatsResponse } from '$lib/types';

	let stats: StatsResponse | null = null;
	let loading = false;
	let error: string | null = null;

	const load = async () => {
		if (!$userStore) {
			return;
		}
		loading = true;
		error = null;
		try {
			stats = await getStats();
		} catch (e) {
			error = e instanceof Error ? e.message : 'failed';
			stats = null;
		} finally {
			loading = false;
		}
	};

	onMount(() => {
		void load();
	});
</script>

<main class="mx-auto max-w-3xl p-6">
	<div class="flex items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold">Profile</h1>
			<p class="mt-1 text-sm text-muted-foreground">Your stats and saved progress.</p>
		</div>
	</div>

	{#if !$userStore}
		<div class="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
			<div class="text-sm text-muted-foreground">Log in to see your stats.</div>
			<button
				type="button"
				class="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
				on:click={() => goto('/login?next=/profile')}
			>
				<span class="material-symbols-outlined text-[18px]" aria-hidden="true">login</span>
				Log in
			</button>
		</div>
	{:else}
		<div class="mt-6 grid gap-4 sm:grid-cols-3">
			<div class="rounded-xl border border-border bg-card p-4 shadow-sm">
				<div class="text-xs text-muted-foreground">Signed in</div>
				<div class="mt-1 truncate text-sm font-medium">{$userStore.email}</div>
			</div>

			<div class="rounded-xl border border-border bg-card p-4 shadow-sm">
				<div class="text-xs text-muted-foreground">Puzzles solved</div>
				<div class="mt-1 text-2xl font-semibold">{stats?.solvedCount ?? '—'}</div>
			</div>

			<div class="rounded-xl border border-border bg-card p-4 shadow-sm">
				<div class="text-xs text-muted-foreground">Created</div>
				<div class="mt-1 text-2xl font-semibold">{stats?.createdCount ?? '—'}</div>
			</div>
		</div>

		<div class="mt-4 rounded-xl border border-border bg-card p-4 shadow-sm">
			<div class="text-xs text-muted-foreground">In progress</div>
			<div class="mt-1 text-2xl font-semibold">{stats?.inProgressCount ?? '—'}</div>
		</div>

		{#if loading}
			<div class="mt-4 text-sm text-muted-foreground">Loading…</div>
		{:else if error}
			<div
				class="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200"
			>
				{error}
			</div>
		{/if}
	{/if}
</main>
