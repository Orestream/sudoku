<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onDestroy, onMount } from 'svelte';
	import Modal from '$lib/components/Modal.svelte';
	import SudokuGrid from '$lib/components/SudokuGrid.svelte';
	import { DIFFICULTY_LEVELS, difficultyLabel } from '$lib/difficulty';
	import { deletePuzzle, getPuzzle, publishPuzzle, updatePuzzle } from '$lib/api';
	import { user as userStore } from '$lib/session';
	import { analyzeSudoku, generateSolvedGrid } from '$lib/sudokuSolver';
	import { emptyGrid, gridToGivensString, parseGivensString } from '$lib/sudoku';
	import { analyzePuzzleDifficulty } from '$lib/solver/difficulty';
	import { generatePuzzle } from '$lib/solver/generator';
	import type { PuzzleDetail } from '$lib/types';

	let puzzle: PuzzleDetail | null = null;
	let loading = true;
	let loadError: string | null = null;

	let title = '';
	let suggestedDifficulty: number = DIFFICULTY_LEVELS[0];

	const givens = emptyGrid();
	let values = emptyGrid();
	let selectedIndices: number[] = [];
	let primaryIndex: number | null = null;

	type NoteLayout = 'corner' | 'center';
	let notes = Array.from({ length: 81 }, () => 0);
	let noteLayouts: NoteLayout[] = Array.from({ length: 81 }, () => 'corner');
	let inputMode: 'value' | 'notes' = 'value';
	let modeBeforeMulti: 'value' | 'notes' = 'value';

	type Snapshot = {
		values: number[];
		notes: number[];
		noteLayouts: NoteLayout[];
	};
	let history: Snapshot[] = [];
	const pushHistory = () => {
		history = [
			...history,
			{
				values: [...values],
				notes: [...notes],
				noteLayouts: [...noteLayouts],
			},
		].slice(-200);
	};

	let liveValidating = false;
	let liveValidation = analyzeSudoku(values);
	let validateTimer: number | null = null;
	let validateToken = 0;
	let calculatedDifficulty: number | null = null;
	let calculatingDifficulty = false;

	let saving = false;
	let autoSaveTimer: number | null = null;
	let lastSignature = '';
	let saveSuccess = false;
	let saveError: string | null = null;
	let publishing = false;
	let publishError: string | null = null;
	let deleteConfirmOpen = false;
	let deleteError: string | null = null;

	let clearConfirmOpen = false;
	let randomConfirmOpen = false;
	let generateModalOpen = false;
	let generatingPuzzle = false;
	let generateTargetDifficulty = 2;
	let remainingByDigit = Array.from({ length: 10 }, () => 9);
	let lastLoadedId: number | null = null;
	let canEdit = false;
	let currentLayout: NoteLayout = 'corner';
	let hasSelection = false;

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

	const resetGrid = (givensString: string) => {
		values = parseGivensString(givensString);
		notes = Array.from({ length: 81 }, () => 0);
		noteLayouts = Array.from({ length: 81 }, () => 'corner');
		selectedIndices = [];
		primaryIndex = null;
		history = [];
		scheduleValidation(values.slice(0, 81), { immediate: true });
	};

	const loadPuzzle = async (id: number) => {
		loading = true;
		loadError = null;
		saveError = null;
		publishError = null;
		try {
			const res = await getPuzzle(id);
			puzzle = res;
			title = res.title ?? '';
			suggestedDifficulty = res.creatorSuggestedDifficulty;
			resetGrid(res.givens);
			noteLayouts = Array.from({ length: 81 }, () => 'corner');
			canEdit = !res.published;
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'failed';
			puzzle = null;
		} finally {
			loading = false;
		}
	};

	$: {
		const pid = Number($page.params.id);
		if (Number.isFinite(pid) && pid > 0 && pid !== lastLoadedId) {
			lastLoadedId = pid;
			void loadPuzzle(pid);
		}
	}

	const scheduleValidation = (grid: number[], opts?: { immediate?: boolean }) => {
		const token = ++validateToken;
		if (validateTimer !== null) {
			window.clearTimeout(validateTimer);
		}
		liveValidating = true;

		const run = () => {
			if (token !== validateToken) {
				return;
			}
			liveValidation = analyzeSudoku(grid);
			if (token === validateToken) {
				liveValidating = false;
				// Calculate difficulty if puzzle is valid and unique
				if (liveValidation.valid && liveValidation.unique) {
					calculatingDifficulty = true;
					// Use setTimeout to avoid blocking UI
					window.setTimeout(() => {
						try {
							calculatedDifficulty = analyzePuzzleDifficulty(givens, grid);
							// Auto-update suggested difficulty if it's different
							if (
								calculatedDifficulty !== null &&
								calculatedDifficulty !== suggestedDifficulty &&
								canEdit
							) {
								suggestedDifficulty = calculatedDifficulty;
							}
						} catch {
							calculatedDifficulty = null;
						} finally {
							calculatingDifficulty = false;
						}
					}, 0);
				} else {
					calculatedDifficulty = null;
				}
			}
		};

		if (opts?.immediate) {
			run();
			return;
		}

		validateTimer = window.setTimeout(run, 250);
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

	const setValue = (value: number, opts?: { fromUndo?: boolean }) => {
		if (!canEdit) {
			return;
		}
		const cells = targets();
		if (cells.length === 0) {
			return;
		}
		const multi = cells.length > 1;

		if (
			value >= 1 &&
			value <= 9 &&
			remainingByDigit[value] <= 0 &&
			values[cells[0]!] !== value &&
			!multi
		) {
			return;
		}
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
				if (values[idx] !== 0) {
					continue;
				}
				next[idx] = (next[idx] ?? 0) ^ bit;
			}
			notes = next;
		} else {
			const idx = cells[0]!;
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
			scheduleValidation(values.slice(0, 81));
		}
	};

	const clearCell = () => {
		if (!canEdit) {
			return;
		}
		const cells = targets();
		if (cells.length === 0) {
			return;
		}
		pushHistory();
		const clearSet = new Set(cells);
		values = values.map((v, i) => (clearSet.has(i) ? 0 : v));
		notes = notes.map((m, i) => (clearSet.has(i) ? 0 : m));
		noteLayouts = noteLayouts.map((layout, i) => (clearSet.has(i) ? 'corner' : layout));
		scheduleValidation(values.slice(0, 81));
	};

	const undo = () => {
		if (!canEdit) {
			return;
		}
		const last = history.at(-1);
		if (!last) {
			return;
		}
		history = history.slice(0, -1);
		values = last.values;
		notes = last.notes;
		noteLayouts = last.noteLayouts;
		scheduleValidation(values.slice(0, 81), { immediate: true });
	};

	const toggleNoteLayout = () => {
		if (!canEdit) {
			return;
		}
		const cells = targets();
		if (cells.length === 0) {
			return;
		}
		pushHistory();
		const next = [...noteLayouts];
		for (const idx of cells) {
			next[idx] = next[idx] === 'corner' ? 'center' : 'corner';
		}
		noteLayouts = next;
	};

	const clearAll = (opts?: { fromConfirm?: boolean }) => {
		if (!canEdit) {
			return;
		}
		if (!opts?.fromConfirm) {
			clearConfirmOpen = true;
			return;
		}
		pushHistory();
		values = emptyGrid();
		notes = Array.from({ length: 81 }, () => 0);
		noteLayouts = Array.from({ length: 81 }, () => 'corner');
		selectedIndices = [];
		primaryIndex = null;
		clearConfirmOpen = false;
		scheduleValidation(values.slice(0, 81), { immediate: true });
	};

	const randomFill = () => {
		if (!canEdit) {
			return;
		}
		randomConfirmOpen = true;
	};

	const generateUniquePuzzle = (): number[] => {
		// Start from a solved grid and remove clues while preserving uniqueness.
		const solution = generateSolvedGrid();
		const puzzle = [...solution];
		const order = Array.from({ length: 81 }, (_, i) => i).sort(() => Math.random() - 0.5);

		for (const idx of order) {
			const backup = puzzle[idx];
			puzzle[idx] = 0;
			const check = analyzeSudoku(puzzle);
			if (!check.valid || !check.unique) {
				puzzle[idx] = backup;
			}
		}
		return puzzle;
	};

	const randomFillConfirmed = () => {
		if (!canEdit) {
			return;
		}
		pushHistory();
		values = generateUniquePuzzle();
		notes = Array.from({ length: 81 }, () => 0);
		noteLayouts = Array.from({ length: 81 }, () => 'corner');
		selectedIndices = [];
		primaryIndex = null;
		randomConfirmOpen = false;
		scheduleValidation(values.slice(0, 81), { immediate: true });
	};

	const generatePuzzleWithDifficulty = async () => {
		if (!canEdit) {
			return;
		}
		generatingPuzzle = true;
		try {
			// Use setTimeout to allow UI to update
			await new Promise((resolve) => setTimeout(resolve, 0));
			const result = generatePuzzle(generateTargetDifficulty);
			pushHistory();
			values = result.puzzle;
			notes = Array.from({ length: 81 }, () => 0);
			noteLayouts = Array.from({ length: 81 }, () => 'corner');
			selectedIndices = [];
			primaryIndex = null;
			suggestedDifficulty = result.difficulty;
			generateModalOpen = false;
			scheduleValidation(values.slice(0, 81), { immediate: true });
		} catch {
			// Error generating, ignore for now
		} finally {
			generatingPuzzle = false;
		}
	};

	const saveDraft = async (opts?: { silent?: boolean }): Promise<boolean> => {
		if (!puzzle || !canEdit) {
			return false;
		}
		if (!opts?.silent) {
			saving = true;
		}
		saveError = null;
		saveSuccess = false;
		try {
			const res = await updatePuzzle(puzzle.id, {
				title: title.trim() ? title.trim() : undefined,
				givens: gridToGivensString(values),
				creatorSuggestedDifficulty: suggestedDifficulty,
			});
			puzzle = res;
			suggestedDifficulty = res.creatorSuggestedDifficulty;
			if (!opts?.silent) {
				saveSuccess = true;
				window.setTimeout(() => {
					saveSuccess = false;
				}, 1800);
			}
			return true;
		} catch (e) {
			saveError = e instanceof Error ? e.message : 'failed';
			return false;
		} finally {
			if (!opts?.silent) {
				saving = false;
			}
		}
	};

	const scheduleAutoSave = () => {
		if (!puzzle || !canEdit) {
			return;
		}
		if (autoSaveTimer !== null) {
			window.clearTimeout(autoSaveTimer);
		}
		autoSaveTimer = window.setTimeout(() => {
			void saveDraft({ silent: true });
		}, 800);
	};

	const publishNow = async () => {
		if (!puzzle || !canEdit) {
			return;
		}
		publishError = null;
		if (!liveValidation.valid || !liveValidation.unique || liveValidating) {
			publishError = 'Puzzle must be valid and unique before publishing.';
			return;
		}
		const saved = await saveDraft({ silent: true });
		if (!saved) {
			publishError = publishError ?? saveError ?? 'save_failed';
			return;
		}
		publishing = true;
		try {
			const res = await publishPuzzle(puzzle.id);
			puzzle = res;
			suggestedDifficulty = res.creatorSuggestedDifficulty;
			canEdit = false;
		} catch (e) {
			publishError = e instanceof Error ? e.message : 'failed';
		} finally {
			publishing = false;
		}
	};

	const removePuzzle = async () => {
		if (!puzzle || puzzle.published) {
			return;
		}
		deleteError = null;
		try {
			await deletePuzzle(puzzle.id);
			await goto('/my');
		} catch (e) {
			deleteError = e instanceof Error ? e.message : 'failed';
		}
	};

	const onKeyDown = (e: KeyboardEvent) => {
		if (!$userStore || !canEdit) {
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
				toggleNoteLayout();
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

	onMount(() => {
		scheduleValidation(values.slice(0, 81), { immediate: true });
		window.addEventListener('keydown', onKeyDown);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', onKeyDown);
		if (validateTimer !== null) {
			window.clearTimeout(validateTimer);
		}
		if (autoSaveTimer !== null) {
			window.clearTimeout(autoSaveTimer);
		}
	});

	$: remainingByDigit = computeRemaining(values);
	$: canEdit = Boolean(puzzle && !puzzle.published);
	$: {
		if (!puzzle || !canEdit) {
			lastSignature = '';
		} else {
			const sig = JSON.stringify({
				t: title,
				d: suggestedDifficulty,
				v: gridToGivensString(values),
			});
			if (sig !== lastSignature) {
				lastSignature = sig;
				scheduleAutoSave();
			}
		}
	}
	$: currentLayout = primaryIndex !== null ? (noteLayouts[primaryIndex] ?? 'corner') : 'corner';
	$: hasSelection = selectedIndices.length > 0 || primaryIndex !== null;
</script>

<main class="mx-auto max-w-5xl p-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold">Editor</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Draft a puzzle and publish it when ready.
			</p>
			{#if puzzle}
				<div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
					<span
						class={`rounded-full px-2.5 py-1 font-semibold ${
							puzzle.published
								? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
								: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
						}`}
					>
						{puzzle.published ? 'Published' : 'Draft'}
					</span>
					<span
						class="rounded-md border border-border bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground"
					>
						ID {puzzle.id}
					</span>
				</div>
			{/if}
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<a
				class="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm transition hover:bg-muted"
				href="/my"
			>
				<span class="material-symbols-outlined text-[18px]" aria-hidden="true"
					>arrow_back</span
				>
				Back to your puzzles
			</a>
			{#if puzzle}
				<a
					class="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm transition hover:bg-muted"
					href={`/play/${puzzle.id}`}
					target="_blank"
					rel="noreferrer"
				>
					<span class="material-symbols-outlined text-[18px]" aria-hidden="true"
						>play_circle</span
					>
					Play test
				</a>
				{#if !puzzle.published}
					<button
						type="button"
						class="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
						on:click={() => (deleteConfirmOpen = true)}
						disabled={saving || publishing}
					>
						<span class="material-symbols-outlined text-[18px]" aria-hidden="true"
							>delete</span
						>
						Delete draft
					</button>
				{/if}
			{/if}
		</div>
	</div>

	{#if !$userStore}
		<div class="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<div class="text-sm font-medium">Log in required</div>
					<div class="mt-1 text-sm text-muted-foreground">
						Editing puzzles is available once you’re logged in. Playing is always free.
					</div>
				</div>
				<button
					type="button"
					class="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
					on:click={() => goto('/login?next=/my')}
				>
					<span class="material-symbols-outlined text-[18px]" aria-hidden="true"
						>login</span
					>
					Log in
				</button>
			</div>
		</div>
	{:else if loadError}
		<div
			class="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200"
		>
			{loadError}
		</div>
	{:else if loading}
		<div class="mt-6 text-sm text-muted-foreground">Loading puzzle…</div>
	{:else if !puzzle}
		<div class="mt-6 text-sm text-muted-foreground">Puzzle not found.</div>
	{:else}
		<div class="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
			<div>
				<SudokuGrid
					{givens}
					{values}
					{notes}
					notesLayout={noteLayouts}
					{selectedIndices}
					{primaryIndex}
					{onSelectionChange}
				/>

				<div class="mt-4 flex flex-wrap items-center justify-between gap-2">
					<div class="flex flex-wrap gap-2">
						<button
							type="button"
							class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-card shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
							on:click={undo}
							disabled={!canEdit || history.length === 0}
							aria-label="Undo"
							title="Undo (Ctrl/Cmd+Z)"
						>
							<span class="material-symbols-outlined text-[20px]" aria-hidden="true"
								>undo</span
							>
						</button>

						<button
							type="button"
							class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 {inputMode ===
							'notes'
								? 'bg-muted text-foreground'
								: 'bg-card text-muted-foreground'}"
							on:click={() => (inputMode = inputMode === 'notes' ? 'value' : 'notes')}
							disabled={!canEdit || selectedIndices.length > 1}
							aria-label={inputMode === 'notes' ? 'Notes on' : 'Notes off'}
							title={inputMode === 'notes' ? 'Notes on' : 'Notes off'}
						>
							<span class="material-symbols-outlined text-[20px]" aria-hidden="true"
								>edit</span
							>
						</button>

						<button
							type="button"
							class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-card shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
							on:click={toggleNoteLayout}
							disabled={!canEdit || !hasSelection}
							aria-label="Toggle note layout"
							title={`Note layout: ${currentLayout}`}
						>
							{#if currentLayout === 'corner'}
								<svg
									viewBox="0 0 24 24"
									class="h-5 w-5"
									aria-hidden="true"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<rect x="5" y="5" width="14" height="14" rx="3" />
									<path d="M8 8h0.01" />
									<path d="M16 8h0.01" />
									<path d="M8 16h0.01" />
									<path d="M16 16h0.01" />
								</svg>
							{:else}
								<svg
									viewBox="0 0 24 24"
									class="h-5 w-5"
									aria-hidden="true"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<rect x="5" y="5" width="14" height="14" rx="3" />
									<path d="M12 12h0.01" />
								</svg>
							{/if}
						</button>

						<button
							type="button"
							class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-card shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
							on:click={() => clearAll()}
							disabled={!canEdit}
							aria-label="Clear grid"
							title="Clear grid"
						>
							<span class="material-symbols-outlined text-[20px]" aria-hidden="true"
								>delete</span
							>
						</button>
					</div>
				</div>

				<div class="mt-3 grid grid-cols-5 gap-2">
					{#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as n}
						<button
							type="button"
							class="relative rounded-md border border-input bg-card px-3 py-2 text-lg shadow-sm transition hover:bg-muted disabled:opacity-40"
							disabled={!canEdit || remainingByDigit[n] <= 0}
							on:click={() => setValue(n)}
						>
							<span class="font-semibold">{n}</span>
							{#if remainingByDigit[n] > 0}
								<span
									class="absolute right-1 top-1/2 -translate-y-1/2 rounded bg-background/70 px-1 py-0.5 text-[10px] font-medium text-muted-foreground"
								>
									{remainingByDigit[n]}
								</span>
							{/if}
						</button>
					{/each}
					<button
						type="button"
						class="flex items-center justify-center rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm hover:bg-muted disabled:opacity-40"
						on:click={clearCell}
						aria-label="Clear cell"
						title="Clear cell"
						disabled={!canEdit}
					>
						<span class="material-symbols-outlined text-[22px]" aria-hidden="true"
							>backspace</span
						>
					</button>
				</div>
			</div>

			<div class="grid gap-6">
				<div class="rounded-lg border border-border bg-card p-4">
					<div class="flex flex-wrap items-center gap-2">
						<span class="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
							{canEdit ? 'Draft (editable)' : 'Published (locked)'}
						</span>
						{#if saveSuccess}
							<span
								class="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
							>
								<span
									class="material-symbols-outlined text-[16px]"
									aria-hidden="true">check_circle</span
								>
								Saved
							</span>
						{/if}
					</div>

					<div class="mt-4 grid gap-4">
						<label class="flex flex-col gap-1 text-sm">
							<span class="text-muted-foreground">Title (optional)</span>
							<input
								class="rounded-md border border-input bg-card px-3 py-2"
								bind:value={title}
								placeholder="My first puzzle"
								disabled={!canEdit}
							/>
						</label>

						<label class="flex flex-col gap-1 text-sm">
							<div class="flex items-center justify-between">
								<span class="text-muted-foreground">Difficulty</span>
								{#if calculatingDifficulty}
									<span class="text-xs text-muted-foreground">Calculating…</span>
								{:else if calculatedDifficulty !== null && liveValidation.valid && liveValidation.unique}
									<span class="text-xs text-muted-foreground">
										Calculated: {difficultyLabel(calculatedDifficulty)}
										{#if calculatedDifficulty !== suggestedDifficulty}
											<span class="ml-1 text-amber-600"
												>(different from selected)</span
											>
										{/if}
									</span>
								{/if}
							</div>
							<select
								class="rounded-md border border-input bg-card px-3 py-2"
								bind:value={suggestedDifficulty}
								disabled={!canEdit}
							>
								{#each DIFFICULTY_LEVELS as d}
									<option value={d}>{difficultyLabel(d)}</option>
								{/each}
							</select>
						</label>

						<div class="flex flex-wrap items-center gap-2">
							<button
								type="button"
								class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-card shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
								on:click={randomFill}
								aria-label="Random draft (unique)"
								title="Random draft with unique solution"
								disabled={!canEdit}
							>
								<span
									class="material-symbols-outlined text-[20px]"
									aria-hidden="true">casino</span
								>
							</button>
							<button
								type="button"
								class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-card shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
								on:click={() => (generateModalOpen = true)}
								disabled={!canEdit}
								title="Generate puzzle with target difficulty"
								aria-label="Generate puzzle"
							>
								<span
									class="material-symbols-outlined text-[20px]"
									aria-hidden="true">auto_awesome</span
								>
							</button>
						</div>

						<div class="flex flex-wrap items-center gap-3">
							<span
								class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors {liveValidation.valid
									? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
									: 'bg-muted text-muted-foreground'}"
							>
								Valid
							</span>
							<span
								class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors {liveValidation.unique
									? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
									: 'bg-muted text-muted-foreground'}"
							>
								Unique
							</span>
						</div>

						<div class="flex flex-wrap gap-2">
							<button
								type="button"
								class="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
								disabled={!canEdit ||
									publishing ||
									liveValidating ||
									!liveValidation.valid ||
									!liveValidation.unique}
								on:click={publishNow}
							>
								{publishing ? 'Publishing…' : 'Publish'}
							</button>
						</div>

						{#if saveError}
							<div
								class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200"
							>
								{saveError}
							</div>
						{/if}

						{#if publishError}
							<div
								class="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-100"
							>
								{publishError}
							</div>
						{/if}

						{#if deleteError}
							<div
								class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200"
							>
								{deleteError}
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<Modal open={clearConfirmOpen}>
			<h2 class="text-lg font-semibold">Clear the grid?</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				This clears all numbers and notes. You can still undo afterwards.
			</p>
			<div class="mt-4 flex items-center justify-end gap-2">
				<button
					type="button"
					class="rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-muted"
					on:click={() => (clearConfirmOpen = false)}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
					on:click={() => clearAll({ fromConfirm: true })}
				>
					Clear
				</button>
			</div>
		</Modal>

		<Modal open={randomConfirmOpen}>
			<h2 class="text-lg font-semibold">Make a random draft?</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				This replaces your current configuration (numbers + notes) with a random,
				uniquely-solvable draft. You can undo afterwards.
			</p>
			<div class="mt-4 flex items-center justify-end gap-2">
				<button
					type="button"
					class="rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-muted"
					on:click={() => (randomConfirmOpen = false)}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
					on:click={randomFillConfirmed}
				>
					Random draft
				</button>
			</div>
		</Modal>

		<Modal open={generateModalOpen}>
			<h2 class="text-lg font-semibold">Generate Puzzle</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				Generate a new puzzle with a target difficulty. This will replace your current
				puzzle.
			</p>

			<div class="mt-4 grid gap-3">
				<label class="flex flex-col gap-1 text-sm">
					<span class="text-muted-foreground">Target Difficulty</span>
					<select
						class="rounded-md border border-input bg-card px-3 py-2"
						bind:value={generateTargetDifficulty}
						disabled={generatingPuzzle}
					>
					{#each DIFFICULTY_LEVELS as d}
						<option value={d} disabled={d > 6}>
							{difficultyLabel(d)}{d > 6 ? ' (not yet implemented)' : ''}
						</option>
					{/each}
					</select>
					{#if generateTargetDifficulty > 6}
						<p class="mt-1 text-xs text-amber-600">
							Only difficulties 1-6 are currently supported. Higher difficulties
							require additional techniques.
						</p>
					{/if}
				</label>

				{#if generatingPuzzle}
					<div
						class="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
					>
						Generating puzzle... This may take a few seconds.
					</div>
				{/if}
			</div>

			<div class="mt-4 flex items-center justify-end gap-2">
				<button
					type="button"
					class="rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-muted"
					on:click={() => (generateModalOpen = false)}
					disabled={generatingPuzzle}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
					disabled={generatingPuzzle || !canEdit}
					on:click={generatePuzzleWithDifficulty}
				>
					{generatingPuzzle ? 'Generating…' : 'Generate'}
				</button>
			</div>
		</Modal>

		<Modal open={deleteConfirmOpen}>
			<h2 class="text-lg font-semibold">Delete this puzzle?</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				This action is only available while the puzzle is a draft.
			</p>
			<div class="mt-4 flex items-center justify-end gap-2">
				<button
					type="button"
					class="rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-muted"
					on:click={() => (deleteConfirmOpen = false)}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
					on:click={() => {
						deleteConfirmOpen = false;
						void removePuzzle();
					}}
					disabled={publishing || saving}
				>
					Delete
				</button>
			</div>
		</Modal>
	{/if}
</main>
