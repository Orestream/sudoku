<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { createPuzzle, deletePuzzle, listMyPuzzles } from '$lib/api';
	import MiniGrid from '$lib/components/MiniGrid.svelte';
	import { difficultyBadgeClass, difficultyLabel } from '$lib/difficulty';
	import { user as userStore } from '$lib/session';
	import type { PuzzleSummary } from '$lib/types';

	let loading = false;
	let error: string | null = null;
	let items: PuzzleSummary[] = [];
	let lastUserId: number | null = null;
	let creating = false;
	let createError: string | null = null;
	let deleteError: string | null = null;
	let deleting: Record<number, boolean> = {};

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

	const startNew = async () => {
		if (!$userStore) {
			await goto('/login?next=/my');
			return;
		}
		creating = true;
		createError = null;
		try {
			const res = await createPuzzle();
			await goto(`/edit/${res.id}`);
		} catch (e) {
			createError = e instanceof Error ? e.message : 'failed';
		} finally {
			creating = false;
		}
	};

	const remove = async (id: number) => {
		if (!$userStore) {
			await goto('/login?next=/my');
			return;
		}
		if (!confirm('Delete this private puzzle?')) {
			return;
		}
		deleting = { ...deleting, [id]: true };
		deleteError = null;
		try {
			await deletePuzzle(id);
			items = items.filter((p) => p.id !== id);
		} catch (e) {
			deleteError = e instanceof Error ? e.message : 'failed';
		} finally {
			deleting = { ...deleting, [id]: false };
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
			<p class="mt-1 text-sm text-muted-foreground">Create, edit, and publish.</p>
		</div>
		<button
			type="button"
			class="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
			on:click={startNew}
			disabled={creating}
		>
			<span
				class="material-symbols-outlined inline-block leading-none text-[18px] align-middle"
				aria-hidden="true">add</span
			>
			{creating ? 'Creating…' : 'New'}
		</button>
	</div>

	{#if createError}
		<div
			class="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200"
		>
			{createError}
		</div>
	{/if}
	{#if deleteError}
		<div
			class="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200"
		>
			{deleteError}
		</div>
	{/if}

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
					<div
						class="group relative rounded-lg border border-border bg-card p-4 shadow-sm transition hover:border-foreground/20 hover:shadow"
						role="button"
						tabindex="0"
						on:click={() => goto(`/edit/${p.id}`)}
						on:keydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								void goto(`/edit/${p.id}`);
							}
						}}
					>
						<div class="absolute right-2 top-2 hidden gap-1 group-hover:flex">
							<a
								class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background/80 text-foreground shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
								href={`/play/${p.id}`}
								on:click|stopPropagation
								title="Play test"
							>
								<span
									class="material-symbols-outlined text-[18px]"
									aria-hidden="true">play_circle</span
								>
							</a>
							{#if !p.published}
								<button
									type="button"
									class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background/80 text-foreground shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
									title="Delete draft"
									on:click|stopPropagation={() => remove(p.id)}
									disabled={Boolean(deleting[p.id])}
								>
									<span
										class="material-symbols-outlined text-[18px]"
										aria-hidden="true"
									>
										{deleting[p.id] ? 'hourglass_bottom' : 'delete'}
									</span>
								</button>
							{/if}
						</div>

						<div class="flex items-center justify-between gap-3">
							<div class="truncate font-semibold">{p.title ?? `Puzzle #${p.id}`}</div>
							<div class="flex items-center gap-2">
								<span
									class={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.published ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'}`}
								>
									{p.published ? 'Published' : 'Draft'}
								</span>
								<div
									class={`rounded px-2 py-1 text-xs font-medium ${difficultyBadgeClass(p.aggregatedDifficulty)}`}
									title={`D${p.aggregatedDifficulty}`}
								>
									{difficultyLabel(p.aggregatedDifficulty)}
								</div>
							</div>
						</div>

						<div class="relative mx-auto mt-3 w-full max-w-[180px]">
							<MiniGrid givens={p.givens} />
						</div>

						<div
							class="mt-3 flex items-center justify-between text-xs text-muted-foreground"
						>
							<span>Created {new Date(p.createdAt).toLocaleDateString()}</span>
							{#if p.published}
								<span
									class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-foreground"
								>
									<span
										class="material-symbols-outlined text-[14px]"
										aria-hidden="true">bar_chart</span
									>
									{p.completionCount} plays
								</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</main>
