<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { listMyPuzzles } from '$lib/api';
	import MiniGrid from '$lib/components/MiniGrid.svelte';
	import { difficultyBadgeClass, difficultyLabel } from '$lib/difficulty';
	import { user as userStore } from '$lib/session';
	import type { PuzzleSummary } from '$lib/types';

	let loading = false;
	let error: string | null = null;
	let items: PuzzleSummary[] = [];
	let lastUserId: number | null = null;

	const load = async () => {
		if (!$userStore) {
			items = [];
			return;
		}
		loading = true;
		error = null;
		try {
			const res = await listMyPuzzles();
			items = res.items;
		} catch (e) {
			error = e instanceof Error ? e.message : 'failed';
			items = [];
		} finally {
			loading = false;
		}
	};

	$: if ($userStore && $userStore.id !== lastUserId) {
		lastUserId = $userStore.id;
		void load();
	}

	onMount(() => {
		void load();
	});
</script>

<main class="mx-auto max-w-5xl p-6">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold">Your puzzles</h1>
			<p class="mt-1 text-sm text-muted-foreground">Your created puzzles.</p>
		</div>
		<button
			type="button"
			class="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
			on:click={() => goto('/create')}
		>
			<span class="material-symbols-outlined inline-block leading-none text-[18px] align-middle" aria-hidden="true">add</span>
			New
		</button>
	</div>

	{#if !$userStore}
		<div class="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
			<div class="text-sm text-muted-foreground">Log in to see your created puzzles.</div>
			<button
				type="button"
				class="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
				on:click={() => goto('/login?next=/my')}
			>
				<span class="material-symbols-outlined text-[18px]" aria-hidden="true">login</span>
				Log in
			</button>
		</div>
	{:else}
		{#if error}
			<div
				class="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200"
			>
				{error}
			</div>
		{/if}

		{#if loading}
			<div class="mt-6 text-sm text-muted-foreground">Loading…</div>
		{:else if items.length === 0}
			<div class="mt-6 text-sm text-muted-foreground">No created puzzles yet.</div>
		{:else}
			<div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each items as p}
					<a
						class="rounded-lg border border-border bg-card p-4 shadow-sm transition hover:border-foreground/20 hover:shadow"
						href={`/play/${p.id}`}
					>
							<div class="flex items-center justify-between gap-3">
								<div class="truncate font-semibold">{p.title ?? `Puzzle #${p.id}`}</div>
								<div
									class={`rounded px-2 py-1 text-xs font-medium ${difficultyBadgeClass(p.aggregatedDifficulty)}`}
									title={`D${p.aggregatedDifficulty}`}
								>
									{difficultyLabel(p.aggregatedDifficulty)}
								</div>
							</div>

						<div class="relative mx-auto mt-3 w-full max-w-[180px]">
							<MiniGrid givens={p.givens} />
						</div>

						<div class="mt-3 text-xs text-muted-foreground">
							Created {new Date(p.createdAt).toLocaleDateString()}
						</div>
					</a>
				{/each}
			</div>
		{/if}
	{/if}
</main>
