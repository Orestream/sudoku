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

<main class="mx-auto max-w-5xl p-4 sm:p-6">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1
				class="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent"
			>
				Your Puzzles
			</h1>
			<p class="mt-1 text-sm text-muted-foreground">Create, edit, and publish.</p>
		</div>
		<button
			type="button"
			class="btn-glow inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
			on:click={startNew}
			disabled={creating}
		>
			<span
				class="material-symbols-outlined inline-block leading-none text-[18px] align-middle"
				aria-hidden="true">add</span
			>
			{creating ? 'Creating…' : 'New Puzzle'}
		</button>
	</div>

	{#if createError}
		<div class="mt-4 glass-panel rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
			{createError}
		</div>
	{/if}
	{#if deleteError}
		<div class="mt-4 glass-panel rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
			{deleteError}
		</div>
	{/if}

	{#if !$userStore}
		<div class="mt-6 glass-panel rounded-xl p-6">
			<div class="text-sm text-muted-foreground">Log in to see your created puzzles.</div>
			<button
				type="button"
				class="mt-4 btn-glow inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
				on:click={() => goto('/login?next=/my')}
			>
				<span class="material-symbols-outlined text-[18px]" aria-hidden="true">login</span>
				Log in
			</button>
		</div>
	{:else}
		{#if error}
			<div class="mt-6 glass-panel rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
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
						class="hero-card group relative rounded-xl p-4 cursor-pointer"
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
								class="btn-glow inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 bg-card/80 text-foreground shadow-sm transition hover:bg-muted focus:outline-none"
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
									class="btn-glow inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 bg-card/80 text-foreground shadow-sm transition hover:bg-muted focus:outline-none disabled:opacity-50"
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
									class={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.published ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'}`}
								>
									{p.published ? 'Published' : 'Draft'}
								</span>
								<div
									class={`rounded-full px-2.5 py-1 text-xs font-medium ${difficultyBadgeClass(p.aggregatedDifficulty)}`}
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
							<span class="flex items-center gap-1">
								<span class="material-symbols-outlined text-[14px]"
									>calendar_today</span
								>
								{new Date(p.createdAt).toLocaleDateString()}
							</span>
							{#if p.published}
								<span class="flex items-center gap-1">
									<span class="material-symbols-outlined text-[14px]"
										>play_circle</span
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
