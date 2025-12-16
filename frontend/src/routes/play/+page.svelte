<script lang="ts">
	import { DIFFICULTY_LEVELS, difficultyBadgeClass, difficultyLabel } from '$lib/difficulty';
	import { listPuzzles } from '$lib/api';
	import MiniGrid from '$lib/components/MiniGrid.svelte';
	import type { PuzzleSummary } from '$lib/types';

	let difficulty = 'all';
	let difficultyValue: number | null = null;
	let loading = false;
	let error: string | null = null;
	let items: PuzzleSummary[] = [];

	const load = async () => {
		loading = true;
		error = null;
		try {
			const res = await listPuzzles(difficultyValue);
			items = res.items;
		} catch (e) {
			error = e instanceof Error ? e.message : 'failed';
			items = [];
		} finally {
			loading = false;
		}
	};

	$: {
		difficultyValue = difficulty === 'all' ? null : Number(difficulty);
		void load();
	}
</script>

<main class="mx-auto max-w-5xl p-6">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold">Play</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Pick a puzzle — or filter by difficulty.
			</p>
		</div>

		<label class="flex flex-col gap-1 text-sm">
			<span class="text-muted-foreground">Difficulty</span>
			<select
				class="rounded-md border border-input bg-card px-3 py-2"
				bind:value={difficulty}
			>
				<option value="all">All</option>
				{#each DIFFICULTY_LEVELS as d}
					<option value={`${d}`}>{difficultyLabel(d)}</option>
				{/each}
			</select>
		</label>
	</div>

	{#if error}
		<div
			class="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200"
		>
			{error}
		</div>
	{/if}

	<div class="mt-6">
		{#if loading}
			<div class="text-sm text-muted-foreground">Loading puzzles…</div>
		{:else if items.length === 0}
			<div class="text-sm text-muted-foreground">No puzzles yet.</div>
		{:else}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each items as p}
					<a
						class="rounded-lg border border-border bg-card p-4 shadow-sm transition hover:border-foreground/20 hover:shadow"
						href={`/play/${p.id}`}
					>
						<div class="flex items-center justify-between gap-3">
							<div class="font-semibold">
								{p.title ?? `Puzzle #${p.id}`}
							</div>
							<div
								class={`rounded px-2 py-1 text-xs font-medium ${difficultyBadgeClass(p.aggregatedDifficulty)}`}
								title={`D${p.aggregatedDifficulty}`}
							>
								{difficultyLabel(p.aggregatedDifficulty)}
							</div>
						</div>

						<div class="relative mx-auto mt-3 w-full max-w-[180px]">
							<div class={p.progress ? 'opacity-45' : ''}>
								<MiniGrid givens={p.givens} />
							</div>
							{#if p.progress}
								<div
									class="pointer-events-none absolute inset-0 grid place-items-center"
								>
									<div class="relative aspect-square w-[62%] max-w-[150px]">
										<svg viewBox="0 0 36 36" class="h-full w-full -rotate-90">
											<path
												d="M18 2.0845
													a 15.9155 15.9155 0 0 1 0 31.831
													a 15.9155 15.9155 0 0 1 0 -31.831"
												fill="none"
												stroke="hsl(var(--muted-foreground) / 0.25)"
												stroke-width="3.5"
												stroke-linecap="round"
											/>
											<path
												d="M18 2.0845
													a 15.9155 15.9155 0 0 1 0 31.831
													a 15.9155 15.9155 0 0 1 0 -31.831"
												fill="none"
												stroke="hsl(var(--primary))"
												stroke-width="3.5"
												stroke-linecap="round"
												stroke-dasharray={`${p.progress.percent}, 100`}
											/>
										</svg>
										<div class="absolute inset-0 grid place-items-center">
											<div
												class="rounded-full bg-background/70 px-2 py-1 text-2xl font-semibold text-foreground backdrop-blur"
											>
												{p.progress.percent}%
											</div>
										</div>
									</div>
								</div>
							{:else if p.solved}
								<div
									class="pointer-events-none absolute right-1 top-1 rounded bg-background/80 px-1 py-0.5 text-[10px] text-foreground"
								>
									<span
										class="material-symbols-outlined align-middle text-[14px]"
										aria-hidden="true"
									>
										check_circle
									</span>
								</div>
							{/if}
						</div>

						<div class="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
							<div>Likes {p.likes}</div>
							<div>Dislikes {p.dislikes}</div>
							<div>Plays {p.completionCount}</div>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</main>
