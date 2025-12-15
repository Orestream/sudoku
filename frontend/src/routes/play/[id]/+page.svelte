<script lang="ts">
	import { page } from '$app/stores';
	import { onDestroy, onMount } from 'svelte';
	import Modal from '$lib/components/Modal.svelte';
	import SudokuGrid from '$lib/components/SudokuGrid.svelte';
	import { DIFFICULTY_LEVELS, difficultyLabel } from '$lib/difficulty';
	import { clearProgress, completePuzzle, getProgress, getPuzzle, saveProgress } from '$lib/api';
	import { user as userStore } from '$lib/session';
	import { emptyGrid, gridToGivensString, isSolved, parseGivensString } from '$lib/sudoku';
	import type { PuzzleDetail } from '$lib/types';

	let puzzle: PuzzleDetail | null = null;
	let loading = true;
	let error: string | null = null;
	let puzzleId = 0;
	let lastLoadedId: number | null = null;
	let lastProgressLoadedId: number | null = null;

	let givens = emptyGrid();
	let values = emptyGrid();
	let selectedIndices: number[] = [];
	let primaryIndex: number | null = null;

	let notes = Array.from({ length: 81 }, () => 0);
	let notesLayout: 'corner' | 'center' = 'corner';
	let inputMode: 'value' | 'notes' = 'value';
	let modeBeforeMulti: 'value' | 'notes' = 'value';

	type Snapshot = {
		values: number[];
		notes: number[];
	};
	let history: Snapshot[] = [];
	const pushHistory = () => {
		history = [
			...history,
			{
				values: [...values],
				notes: [...notes]
			}
		].slice(-200);
	};

	let startedAt = Date.now();
	let solved = false;
	let modalOpen = false;
	let submitError: string | null = null;
	let submitting = false;

	let difficultyVote = 1;
	let liked: boolean | null = null;
	let saveTimer: number | null = null;
	let remainingByDigit = Array.from({ length: 10 }, () => 9);

	const computeRemaining = (grid: number[]): number[] => {
		const counts = Array.from({ length: 10 }, () => 0);
		for (const v of grid) {
			if (v >= 1 && v <= 9) {
				counts[v]++;
			}
		}
		const remaining = Array.from({ length: 10 }, () => 0);
		for (let n = 1; n <= 9; n++) {
			remaining[n] = Math.max(0, 9 - counts[n]);
		}
		return remaining;
	};

	const loadPuzzle = async (id: number) => {
		loading = true;
		error = null;
		try {
			const res = await getPuzzle(id);
			puzzle = res;
			givens = parseGivensString(res.givens);
			values = [...givens];
			notes = Array.from({ length: 81 }, () => 0);
			history = [];
			inputMode = 'value';
			notesLayout = 'corner';
			selectedIndices = [];
			primaryIndex = null;
			difficultyVote = res.aggregatedDifficulty;
			liked = null;
			startedAt = Date.now();
			solved = false;
			modalOpen = false;
			lastProgressLoadedId = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'failed';
			puzzle = null;
		} finally {
			loading = false;
		}
	};

	const onSelectionChange = (indices: number[], primary: number | null) => {
		const wasMulti = selectedIndices.length > 1;
		const isMulti = indices.length > 1;
		if (!wasMulti && isMulti) {
			modeBeforeMulti = inputMode;
			inputMode = 'notes';
		}
		if (wasMulti && !isMulti) {
			inputMode = modeBeforeMulti;
		}
		selectedIndices = indices;
		primaryIndex = primary;
	};

	const targets = (): number[] => {
		if (selectedIndices.length) {
			return selectedIndices;
		}
		if (primaryIndex !== null) {
			return [primaryIndex];
		}
		return [];
	};

	const scheduleSave = () => {
		if (!$userStore || !puzzle) {
			return;
		}
		const id = puzzle.id;
		if (saveTimer !== null) {
			window.clearTimeout(saveTimer);
		}
		saveTimer = window.setTimeout(async () => {
			try {
				await saveProgress(id, {
					values: gridToGivensString(values),
					cornerNotes: notes,
					centerNotes: notes
				});
			} catch {}
		}, 350);
	};

	const setValue = (value: number, opts?: { fromUndo?: boolean }) => {
		const cells = targets();
		if (cells.length === 0) {
			return;
		}
		const multi = cells.length > 1;

		if (inputMode === 'notes' || multi) {
			if (value <= 0 || value > 9) {
				return;
			}
			if (!opts?.fromUndo) {
				pushHistory();
			}
			const bit = 1 << (value - 1);
			const next = [...notes];
			for (const idx of cells) {
				if (givens[idx] !== 0) {
					continue;
				}
				if (values[idx] !== 0) {
					continue;
				}
				next[idx] = (next[idx] ?? 0) ^ bit;
			}
			notes = next;
		} else {
			const idx = cells[0]!;
			if (givens[idx] !== 0) {
				return;
			}
			if (value >= 1 && value <= 9 && remainingByDigit[value] <= 0 && values[idx] !== value) {
				return;
			}
			if (!opts?.fromUndo) {
				pushHistory();
			}
			values = values.map((v, i) => (i === idx ? value : v));
			if (value !== 0) {
				notes = notes.map((m, i) => (i === idx ? 0 : m));
			}
		}

		solved = isSolved(values);
		if (solved) {
			modalOpen = true;
		}
		scheduleSave();
	};

	const clearCell = () => {
		const cells = targets();
		if (cells.length === 0) {
			return;
		}
		pushHistory();
		const clearSet = new Set(cells);
		values = values.map((v, i) => (clearSet.has(i) && givens[i] === 0 ? 0 : v));
		notes = notes.map((m, i) => (clearSet.has(i) && givens[i] === 0 ? 0 : m));
		solved = isSolved(values);
		scheduleSave();
	};

	const undo = () => {
		const last = history.at(-1);
		if (!last) {
			return;
		}
		history = history.slice(0, -1);
		values = last.values;
		notes = last.notes;
		solved = isSolved(values);
		scheduleSave();
	};

	const onKeyDown = (e: KeyboardEvent) => {
		if (modalOpen) {
			return;
		}
		const active = document.activeElement as HTMLElement | null;
		const tag = active?.tagName?.toLowerCase();
		if (tag === 'input' || tag === 'textarea' || tag === 'select') {
			return;
		}

		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
			e.preventDefault();
			undo();
			return;
		}

		if (!e.ctrlKey && !e.metaKey && !e.altKey) {
			if (e.key.toLowerCase() === 'n') {
				e.preventDefault();
				if (selectedIndices.length <= 1) {
					inputMode = inputMode === 'notes' ? 'value' : 'notes';
				}
				return;
			}
			if (e.key.toLowerCase() === 'c') {
				e.preventDefault();
				notesLayout = notesLayout === 'corner' ? 'center' : 'corner';
				return;
			}
		}

		if (e.key >= '1' && e.key <= '9') {
			setValue(Number(e.key));
			return;
		}
		if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
			clearCell();
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
			if ($userStore) {
				await clearProgress(puzzle.id);
			}
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
		if (saveTimer !== null) {
			window.clearTimeout(saveTimer);
		}
	});

	$: puzzleId = Number($page.params.id);
	$: if (!Number.isNaN(puzzleId) && puzzleId !== lastLoadedId) {
		lastLoadedId = puzzleId;
		void loadPuzzle(puzzleId);
	}

	$: remainingByDigit = computeRemaining(values);

	$: if (puzzle && $userStore && puzzle.id !== lastProgressLoadedId) {
		lastProgressLoadedId = puzzle.id;
		void (async () => {
			try {
				const p = await getProgress(puzzle.id);
				if (!p) {
					return;
				}
				values = parseGivensString(p.values);
				const corner = p.cornerNotes.length === 81 ? p.cornerNotes : Array.from({ length: 81 }, () => 0);
				const center = p.centerNotes.length === 81 ? p.centerNotes : Array.from({ length: 81 }, () => 0);
				notes = corner.map((m, i) => m | (center[i] ?? 0));
				history = [];
				solved = isSolved(values);
			} catch {}
		})();
	}
</script>

<main class="mx-auto max-w-5xl p-6">
	{#if loading}
		<div class="text-sm text-muted-foreground">Loading…</div>
	{:else if error}
		<div
			class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200"
		>
			{error}
		</div>
	{:else if puzzle}
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<h1 class="text-2xl font-semibold">{puzzle.title ?? `Puzzle #${puzzle.id}`}</h1>
				<p class="mt-1 text-sm text-muted-foreground">
					Community difficulty: {difficultyLabel(puzzle.aggregatedDifficulty)} (D{puzzle.aggregatedDifficulty}) · Likes
					{puzzle.likes} · Dislikes {puzzle.dislikes}
				</p>
			</div>
			<a class="text-sm text-muted-foreground underline" href="/play">Back to list</a>
		</div>

		<div class="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
			<div>
				<SudokuGrid
					{givens}
					{values}
					{notes}
					{notesLayout}
					{selectedIndices}
					{primaryIndex}
					onSelectionChange={onSelectionChange}
				/>

				<div class="mt-4 flex flex-wrap items-center justify-between gap-2">
					<div class="flex flex-wrap gap-2">
						<button
							type="button"
							class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-card shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
							on:click={undo}
							disabled={history.length === 0}
							title="Undo (Ctrl/Cmd+Z)"
							aria-label="Undo"
						>
							<span class="material-symbols-outlined text-[20px]" aria-hidden="true">undo</span>
						</button>
					</div>

					<div class="flex flex-wrap gap-2">
						<button
							type="button"
							class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 {inputMode === 'notes' ? 'bg-muted text-foreground' : 'bg-card text-muted-foreground'}"
							on:click={() => (inputMode = inputMode === 'notes' ? 'value' : 'notes')}
							disabled={selectedIndices.length > 1}
							aria-label={inputMode === 'notes' ? 'Notes on' : 'Notes off'}
							title={inputMode === 'notes' ? 'Notes on' : 'Notes off'}
						>
							<span class="material-symbols-outlined text-[20px]" aria-hidden="true">edit</span>
						</button>

						<button
							type="button"
							class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-card shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
							on:click={() => (notesLayout = notesLayout === 'corner' ? 'center' : 'corner')}
							disabled={inputMode !== 'notes'}
							aria-label="Toggle note layout"
							title={`Note layout: ${notesLayout}`}
						>
							{#if notesLayout === 'corner'}
								<svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
									<rect x="5" y="5" width="14" height="14" rx="3" />
									<path d="M8 8h0.01" />
									<path d="M16 8h0.01" />
									<path d="M8 16h0.01" />
									<path d="M16 16h0.01" />
								</svg>
							{:else}
								<svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
									<rect x="5" y="5" width="14" height="14" rx="3" />
									<path d="M12 12h0.01" />
								</svg>
							{/if}
						</button>
					</div>
				</div>

				<div class="mt-3 grid grid-cols-5 gap-2">
					{#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as n}
						<button
							type="button"
							class="relative rounded-md border border-input bg-card px-3 py-2 text-lg shadow-sm transition hover:bg-muted disabled:opacity-40"
							disabled={remainingByDigit[n] <= 0}
							on:click={() => setValue(n)}
						>
							<span class="font-semibold">{n}</span>
							{#if remainingByDigit[n] > 0}
								<span class="absolute right-1 top-1/2 -translate-y-1/2 rounded bg-background/70 px-1 py-0.5 text-[10px] font-medium text-muted-foreground">
									{remainingByDigit[n]}
								</span>
							{/if}
						</button>
					{/each}
					<button
						type="button"
						class="flex items-center justify-center rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm hover:bg-muted"
						on:click={clearCell}
						aria-label="Clear cell"
						title="Clear cell"
					>
						<span class="material-symbols-outlined text-[22px]" aria-hidden="true">backspace</span>
					</button>
				</div>

				{#if solved}
					<div
						class="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
					>
						Solved! Rate the puzzle.
					</div>
				{/if}
			</div>

			<div class="rounded-lg border border-border bg-card p-4">
				<h2 class="font-semibold">How it works</h2>
				<ul class="mt-2 list-disc pl-5 text-sm text-muted-foreground">
					<li>Puzzles are sorted by community goodness (Wilson score on likes/dislikes).</li>
					<li>Displayed difficulty is the community vote average over time.</li>
					<li>After finishing, vote difficulty and like/dislike.</li>
				</ul>
			</div>
		</div>

		<Modal open={modalOpen}>
			<h2 class="text-xl font-semibold">Puzzle complete</h2>
			<p class="mt-1 text-sm text-muted-foreground">Help the community: vote difficulty and rate it.</p>

			<div class="mt-4 grid gap-3">
				<label class="flex flex-col gap-1 text-sm">
					<span class="text-muted-foreground">Difficulty vote</span>
					<select
						class="rounded-md border border-input bg-card px-3 py-2"
						bind:value={difficultyVote}
					>
						{#each DIFFICULTY_LEVELS as d}
							<option value={d}>{difficultyLabel(d)}</option>
						{/each}
					</select>
				</label>

				<div class="text-sm">
					<div class="text-muted-foreground">Rating</div>
					<div class="mt-2 flex gap-2">
						<button
							type="button"
							class="rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-muted"
							on:click={() => (liked = true)}
						>
							Like
						</button>
						<button
							type="button"
							class="rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-muted"
							on:click={() => (liked = false)}
						>
							Dislike
						</button>
						<button
							type="button"
							class="rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-muted"
							on:click={() => (liked = null)}
						>
							Skip
						</button>
					</div>
					<div class="mt-1 text-xs text-muted-foreground">
						Current: {liked === null ? 'skip' : liked ? 'like' : 'dislike'}
					</div>
				</div>

				{#if submitError}
					<div
						class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200"
					>
						{submitError}
					</div>
				{/if}

				<div class="mt-2 flex items-center justify-end gap-2">
					<button
						type="button"
						class="rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-muted"
						on:click={() => (modalOpen = false)}
					>
						Close
					</button>
					<button
						type="button"
						class="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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
