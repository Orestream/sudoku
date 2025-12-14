<script lang="ts">
	import { page } from '$app/stores';
	import { onDestroy, onMount } from 'svelte';
	import Modal from '$lib/components/Modal.svelte';
	import SudokuGrid from '$lib/components/SudokuGrid.svelte';
	import { DIFFICULTY_LEVELS } from '$lib/difficulty';
	import { completePuzzle, getPuzzle } from '$lib/api';
	import { emptyGrid, isSolved, parseGivensString } from '$lib/sudoku';
	import type { PuzzleDetail } from '$lib/types';

	let puzzle: PuzzleDetail | null = null;
	let loading = true;
	let error: string | null = null;
	let puzzleId = 0;
	let lastLoadedId: number | null = null;

	let givens = emptyGrid();
	let values = emptyGrid();
	let selectedIndex: number | null = null;

	let startedAt = Date.now();
	let solved = false;
	let modalOpen = false;
	let submitError: string | null = null;
	let submitting = false;

	let difficultyVote = 1;
	let liked: boolean | null = null;

	const loadPuzzle = async (id: number) => {
		loading = true;
		error = null;
		try {
			const res = await getPuzzle(id);
			puzzle = res;
			givens = parseGivensString(res.givens);
			values = [...givens];
			difficultyVote = res.aggregatedDifficulty;
			liked = null;
			startedAt = Date.now();
			solved = false;
			modalOpen = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'failed';
			puzzle = null;
		} finally {
			loading = false;
		}
	};

	const setValue = (value: number) => {
		if (selectedIndex === null) {
			return;
		}
		if (givens[selectedIndex] !== 0) {
			return;
		}
		values = values.map((v, i) => (i === selectedIndex ? value : v));
		solved = isSolved(values);
		if (solved) {
			modalOpen = true;
		}
	};

	const onKeyDown = (e: KeyboardEvent) => {
		if (modalOpen) {
			return;
		}
		if (e.key >= '1' && e.key <= '9') {
			setValue(Number(e.key));
			return;
		}
		if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
			setValue(0);
		}
	};

	const submit = async () => {
		if (!puzzle) {
			return;
		}
		submitting = true;
		submitError = null;
		try {
			await completePuzzle(puzzle.id, {
				timeMs: Math.max(0, Date.now() - startedAt),
				difficultyVote,
				liked
			});
			modalOpen = false;
		} catch (e) {
			submitError = e instanceof Error ? e.message : 'failed';
		} finally {
			submitting = false;
		}
	};

	onMount(() => {
		window.addEventListener('keydown', onKeyDown);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', onKeyDown);
	});

	$: puzzleId = Number($page.params.id);
	$: if (!Number.isNaN(puzzleId) && puzzleId !== lastLoadedId) {
		lastLoadedId = puzzleId;
		void loadPuzzle(puzzleId);
	}
</script>

<main class="mx-auto max-w-5xl p-6">
	{#if loading}
		<div class="text-sm text-slate-600">Loading…</div>
	{:else if error}
		<div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
			{error}
		</div>
	{:else if puzzle}
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<h1 class="text-2xl font-semibold">{puzzle.title ?? `Puzzle #${puzzle.id}`}</h1>
				<p class="mt-1 text-sm text-slate-600">
					Community difficulty: {puzzle.aggregatedDifficulty} · Likes {puzzle.likes} · Dislikes
					{puzzle.dislikes}
				</p>
			</div>
			<a class="text-sm text-slate-600 underline" href="/play">Back to list</a>
		</div>

		<div class="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
			<div>
				<SudokuGrid
					{givens}
					{values}
					{selectedIndex}
					onSelect={(i) => (selectedIndex = i)}
				/>

				<div class="mt-4 grid grid-cols-5 gap-2">
					{#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as n}
						<button
							type="button"
							class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50"
							on:click={() => setValue(n)}
						>
							{n}
						</button>
					{/each}
					<button
						type="button"
						class="col-span-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50"
						on:click={() => setValue(0)}
					>
						Clear
					</button>
				</div>

				{#if solved}
					<div class="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
						Solved! Rate the puzzle.
					</div>
				{/if}
			</div>

			<div class="rounded-lg border border-slate-200 bg-white p-4">
				<h2 class="font-semibold">How it works</h2>
				<ul class="mt-2 list-disc pl-5 text-sm text-slate-600">
					<li>Puzzles are sorted by community goodness (Wilson score on likes/dislikes).</li>
					<li>Displayed difficulty is the community vote average over time.</li>
					<li>After finishing, vote difficulty and like/dislike.</li>
				</ul>
			</div>
		</div>

		<Modal open={modalOpen}>
			<h2 class="text-xl font-semibold">Puzzle complete</h2>
			<p class="mt-1 text-sm text-slate-600">Help the community: vote difficulty and rate it.</p>

			<div class="mt-4 grid gap-3">
				<label class="flex flex-col gap-1 text-sm">
					<span class="text-slate-600">Difficulty vote</span>
					<select
						class="rounded-md border border-slate-300 bg-white px-3 py-2"
						bind:value={difficultyVote}
					>
						{#each DIFFICULTY_LEVELS as d}
							<option value={d}>{d}</option>
						{/each}
					</select>
				</label>

				<div class="text-sm">
					<div class="text-slate-600">Rating</div>
					<div class="mt-2 flex gap-2">
						<button
							type="button"
							class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
							on:click={() => (liked = true)}
						>
							Like
						</button>
						<button
							type="button"
							class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
							on:click={() => (liked = false)}
						>
							Dislike
						</button>
						<button
							type="button"
							class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
							on:click={() => (liked = null)}
						>
							Skip
						</button>
					</div>
					<div class="mt-1 text-xs text-slate-500">
						Current: {liked === null ? 'skip' : liked ? 'like' : 'dislike'}
					</div>
				</div>

				{#if submitError}
					<div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
						{submitError}
					</div>
				{/if}

				<div class="mt-2 flex items-center justify-end gap-2">
					<button
						type="button"
						class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
						on:click={() => (modalOpen = false)}
					>
						Close
					</button>
					<button
						type="button"
						class="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
						disabled={submitting}
						on:click={submit}
					>
						{submitting ? 'Submitting…' : 'Submit'}
					</button>
				</div>
			</div>
		</Modal>
	{/if}
</main>
