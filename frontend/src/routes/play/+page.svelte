<script lang="ts">
	import { DIFFICULTY_LEVELS } from '$lib/difficulty';
	import { listPuzzles } from '$lib/api';
	import type { PuzzleSummary } from '$lib/types';

	let difficulty = '';
	let difficultyValue: number | null = null;
	let loading = false;
	let error: string | null = null;
	let items: PuzzleSummary[] = [];

	const load = async () => {
		if (difficultyValue === null) {
			return;
		}
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

	$: difficultyValue = difficulty ? Number(difficulty) : null;

	$: if (difficultyValue !== null) {
		void load();
	}
</script>

<main class="mx-auto max-w-5xl p-6">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold">Play</h1>
			<p class="mt-1 text-sm text-slate-600">Choose difficulty, then pick a puzzle.</p>
		</div>

		<label class="flex flex-col gap-1 text-sm">
			<span class="text-slate-600">Difficulty</span>
			<select
				class="rounded-md border border-slate-300 bg-white px-3 py-2"
				bind:value={difficulty}
			>
				<option value="" disabled>Select…</option>
				{#each DIFFICULTY_LEVELS as d}
					<option value={`${d}`}>{d}</option>
				{/each}
			</select>
		</label>
	</div>

	{#if error}
		<div class="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
			{error}
		</div>
	{/if}

	<div class="mt-6">
		{#if loading}
			<div class="text-sm text-slate-600">Loading puzzles…</div>
		{:else if difficultyValue === null}
			<div class="text-sm text-slate-600">Select a difficulty to see puzzles.</div>
		{:else if items.length === 0}
			<div class="text-sm text-slate-600">No puzzles yet for this difficulty.</div>
		{:else}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each items as p}
					<a
						class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow"
						href={`/play/${p.id}`}
					>
						<div class="flex items-center justify-between gap-3">
							<div class="font-semibold">
								{p.title ?? `Puzzle #${p.id}`}
							</div>
							<div class="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
								D{p.aggregatedDifficulty}
							</div>
						</div>
						<div class="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
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
