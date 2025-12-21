<script lang="ts">
	import { page } from '$app/stores';
	import { onDestroy, onMount } from 'svelte';
	import Modal from '$lib/components/Modal.svelte';
	import SudokuGrid from '$lib/components/SudokuGrid.svelte';
	import SolverDebugger from '$lib/components/SolverDebugger.svelte';
	import { DIFFICULTY_LEVELS, difficultyLabel } from '$lib/difficulty';
	import { clearProgress, completePuzzle, getProgress, getPuzzle, saveProgress } from '$lib/api';
	import { user as userStore } from '$lib/session';
	import { emptyGrid, gridToGivensString, isSolved, parseGivensString } from '$lib/sudoku';
	import type { Grid } from '$lib/sudoku';
	import type { PuzzleDetail } from '$lib/types';
	import { TechniqueSolver } from '$lib/solver/solver';
	import type { SolveStep, Hint } from '$lib/solver/types';

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

	type NoteLayout = 'corner' | 'center';
	let notes = Array.from({ length: 81 }, () => 0);
	let noteLayouts: NoteLayout[] = Array.from({ length: 81 }, () => 'corner');
	let currentLayout: NoteLayout = 'corner';
	let hasSelection = false;
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

	let startedAt = Date.now();
	let solved = false;
	let modalOpen = false;
	let submitError: string | null = null;
	let submitting = false;

	let difficultyVote = 1;
	let liked: boolean | null = null;
	let saveTimer: number | null = null;
	let resetConfirmOpen = false;
	let remainingByDigit = Array.from({ length: 10 }, () => 9);
	let debuggerOpen = false;
	// These are set by handlers for potential future use
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let debuggerStep: SolveStep | null = null;
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let debuggerHint: Hint | null = null;
	let highlightedCells: Set<number> = new Set();
	let debuggerGridValues: Grid | null = null;
	let debuggerGridNotes: number[] | null = null;
	let debuggerHighlightedIndices: number[] = [];
	let hintSolver: TechniqueSolver | null = null;
	let currentHint: Hint | null = null;
	let currentHintSequence: Hint[] = [];
	let hintModalOpen = false;

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
			noteLayouts = Array.from({ length: 81 }, () => 'corner');
			history = [];
			inputMode = 'value';
			selectedIndices = [];
			primaryIndex = null;
			difficultyVote = res.aggregatedDifficulty;
			liked = null;
			startedAt = Date.now();
			solved = false;
			modalOpen = false;
			lastProgressLoadedId = null;
			debuggerOpen = false;
			debuggerStep = null;
			debuggerHint = null;
			debuggerGridValues = null;
			debuggerGridNotes = null;
			debuggerHighlightedIndices = [];
			highlightedCells = new Set();
			updateHint();
		} catch (e) {
			error = e instanceof Error ? e.message : 'failed';
			puzzle = null;
		} finally {
			loading = false;
		}
	};

	const handleDebuggerStepChange = (step: SolveStep | null) => {
		debuggerStep = step;
		highlightedCells = new Set();
		if (step) {
			if (step.affectedCells) {
				step.affectedCells.forEach((idx) => highlightedCells.add(idx));
			}
		}
	};

	const handleDebuggerHintChange = (hint: Hint | null) => {
		debuggerHint = hint;
		highlightedCells = new Set();
		if (hint) {
			if (hint.affectedCells) {
				hint.affectedCells.forEach((idx) => highlightedCells.add(idx));
			}
		}
	};

	const handleDebuggerGridStateChange = (
		gridValues: Grid,
		gridNotes: number[],
		highlightedIndices: number[],
	) => {
		debuggerGridValues = gridValues;
		debuggerGridNotes = gridNotes;
		debuggerHighlightedIndices = highlightedIndices;
		highlightedCells = new Set(highlightedIndices);
	};

	const updateHint = () => {
		if (!puzzle) {
			return;
		}
		hintSolver = new TechniqueSolver(values, givens);
		const sequence = hintSolver.getHintSequence();
		currentHintSequence = sequence;
		currentHint = sequence.length > 0 ? sequence[0]! : null;
	};

	const applyHint = () => {
		if (!currentHint || !hintSolver) {
			return;
		}

		pushHistory();

		// Apply solved cells
		if (currentHint.solvedCells) {
			for (const cell of currentHint.solvedCells) {
				values = values.map((v, i) => (i === cell.index ? cell.value : v));
				notes = notes.map((m, i) => (i === cell.index ? 0 : m));
				pruneNotesFor(cell.index, cell.value);
			}
		}

		// Apply candidate eliminations
		if (currentHint.eliminatedCandidates) {
			for (const elim of currentHint.eliminatedCandidates) {
				const bit = 1 << (elim.digit - 1);
				notes = notes.map((m, i) => (i === elim.index ? m & ~bit : m));
			}
		}

		solved = isSolved(values);
		if (solved) {
			modalOpen = true;
		}
		scheduleSave();
		updateHint();
		hintModalOpen = false;
		highlightedCells = new Set();
	};

	$: {
		if (values && givens && !debuggerOpen) {
			updateHint();
		}
	}

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
				const cornerNotes = notes.map((mask, i) =>
					noteLayouts[i] === 'corner' ? mask : 0,
				);
				const centerNotes = notes.map((mask, i) =>
					noteLayouts[i] === 'center' ? mask : 0,
				);
				await saveProgress(id, {
					values: gridToGivensString(values),
					cornerNotes,
					centerNotes,
				});
			} catch {
				// Ignore save errors silently
			}
		}, 350);
	};

	const pruneNotesFor = (pos: number, digit: number) => {
		if (digit < 1 || digit > 9) {
			return;
		}
		const r = Math.floor(pos / 9);
		const c = pos % 9;
		const boxR = Math.floor(r / 3) * 3;
		const boxC = Math.floor(c / 3) * 3;
		for (let i = 0; i < 9; i++) {
			const rowIdx = r * 9 + i;
			if (givens[rowIdx] === 0 && values[rowIdx] === 0) {
				notes[rowIdx] = notes[rowIdx] & ~(1 << (digit - 1));
			}
			const colIdx = i * 9 + c;
			if (givens[colIdx] === 0 && values[colIdx] === 0) {
				notes[colIdx] = notes[colIdx] & ~(1 << (digit - 1));
			}
			const boxIdx = (boxR + Math.floor(i / 3)) * 9 + (boxC + (i % 3));
			if (givens[boxIdx] === 0 && values[boxIdx] === 0) {
				notes[boxIdx] = notes[boxIdx] & ~(1 << (digit - 1));
			}
		}
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
				pruneNotesFor(idx, value);
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
		noteLayouts = noteLayouts.map((layout, i) =>
			clearSet.has(i) && givens[i] === 0 ? 'corner' : layout,
		);
		solved = isSolved(values);
		scheduleSave();
	};

	const toggleNoteLayout = () => {
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
		scheduleSave();
	};

	const autoGenerateNotes = () => {
		pushHistory();
		const FULL_MASK = (1 << 9) - 1; // 0b111111111 - all 9 digits possible

		// Build masks for rows, columns, and boxes
		const rowMask = Array.from({ length: 9 }, () => 0);
		const colMask = Array.from({ length: 9 }, () => 0);
		const boxMask = Array.from({ length: 9 }, () => 0);

		for (let i = 0; i < 81; i++) {
			const v = values[i];
			if (v >= 1 && v <= 9) {
				const r = Math.floor(i / 9);
				const c = i % 9;
				const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
				const bit = 1 << (v - 1);
				rowMask[r] |= bit;
				colMask[c] |= bit;
				boxMask[b] |= bit;
			}
		}

		// Set candidates for empty cells
		const nextNotes = [...notes];
		for (let i = 0; i < 81; i++) {
			if (givens[i] !== 0 || values[i] !== 0) {
				// Don't set notes for givens or filled cells
				nextNotes[i] = 0;
				continue;
			}
			const r = Math.floor(i / 9);
			const c = i % 9;
			const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
			const used = rowMask[r] | colMask[c] | boxMask[b];
			nextNotes[i] = FULL_MASK & ~used;
		}
		notes = nextNotes;
		scheduleSave();
	};

	const clearAllNotes = () => {
		pushHistory();
		notes = Array.from({ length: 81 }, () => 0);
		scheduleSave();
	};

	const resetProgress = async () => {
		if (!$userStore || !puzzle) {
			return;
		}
		try {
			await clearProgress(puzzle.id);
			values = [...givens];
			notes = Array.from({ length: 81 }, () => 0);
			noteLayouts = Array.from({ length: 81 }, () => 'corner');
			history = [];
			selectedIndices = [];
			primaryIndex = null;
			solved = false;
			modalOpen = false;
		} catch {
			// ignore errors silently for now
		}
	};

	const undo = () => {
		const last = history.at(-1);
		if (!last) {
			return;
		}
		history = history.slice(0, -1);
		values = last.values;
		notes = last.notes;
		noteLayouts = last.noteLayouts;
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
				liked,
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
	$: currentLayout = primaryIndex !== null ? (noteLayouts[primaryIndex] ?? 'corner') : 'corner';
	$: hasSelection = selectedIndices.length > 0 || primaryIndex !== null;

	$: if (puzzle && $userStore && puzzle.id !== lastProgressLoadedId) {
		lastProgressLoadedId = puzzle.id;
		void (async () => {
			try {
				const p = await getProgress(puzzle.id);
				if (!p) {
					return;
				}
				values = parseGivensString(p.values);
				const corner =
					p.cornerNotes.length === 81
						? p.cornerNotes
						: Array.from({ length: 81 }, () => 0);
				const center =
					p.centerNotes.length === 81
						? p.centerNotes
						: Array.from({ length: 81 }, () => 0);
				notes = corner.map((m, i) => m | (center[i] ?? 0));
				noteLayouts = corner.map((m, i) =>
					(center[i] ?? 0) !== 0 ? 'center' : m !== 0 ? 'corner' : 'corner',
				);
				history = [];
				solved = isSolved(values);
			} catch {
				// Ignore load progress errors silently
			}
		})();
	}
</script>

<main
	class="mx-auto max-w-5xl p-2 sm:p-4 lg:p-6 h-[calc(100vh-65px)] lg:h-auto overflow-hidden lg:overflow-visible"
>
	{#if loading}
		<div class="text-sm text-muted-foreground">Loading…</div>
	{:else if error}
		<div class="glass-panel rounded-lg p-3 text-sm text-red-700 dark:text-red-200">
			{error}
		</div>
	{:else if puzzle}
		<!-- Compact header for mobile -->
		<div class="flex items-center justify-between gap-2 mb-2 lg:mb-4">
			<div class="min-w-0 flex-1">
				<h1 class="text-lg sm:text-xl lg:text-2xl font-semibold truncate">
					{puzzle.title ?? `Puzzle #${puzzle.id}`}
				</h1>
				<p class="text-xs sm:text-sm text-muted-foreground truncate">
					{difficultyLabel(puzzle.aggregatedDifficulty)} ·
					<span class="hidden sm:inline">Likes </span>👍{puzzle.likes} · 👎{puzzle.dislikes}
				</p>
			</div>
			<a
				class="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
				href="/play"
			>
				<span class="material-symbols-outlined text-[16px]">arrow_back</span>
				<span class="hidden sm:inline">Back</span>
			</a>
		</div>

		<div class="grid gap-3 lg:gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
			<div class="flex flex-col gap-2">
				<div class="w-full aspect-square">
					<SudokuGrid
						{givens}
						values={debuggerOpen && debuggerGridValues ? debuggerGridValues : values}
						notes={debuggerOpen && debuggerGridNotes ? debuggerGridNotes : notes}
						notesLayout={noteLayouts}
						{selectedIndices}
						{primaryIndex}
						{onSelectionChange}
						highlightedIndices={debuggerOpen ? debuggerHighlightedIndices : []}
					/>
				</div>

				<!-- Controls container - below grid -->
				<div class="mt-2 lg:mt-4">
					<!-- Tools panel - always visible, above numbers -->
					<div class="mb-2">
						<div class="glass-panel rounded-lg p-2 sm:p-3">
							<div class="flex flex-wrap items-center justify-center gap-2">
								<button
									type="button"
									class="btn-glow inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 bg-card/50 transition-all hover:bg-muted disabled:opacity-50"
									on:click={undo}
									disabled={history.length === 0}
									title="Undo (Ctrl/Cmd+Z)"
									aria-label="Undo"
								>
									<span class="material-symbols-outlined text-[20px]">undo</span>
								</button>

								<button
									type="button"
									class="btn-glow inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 transition-all {inputMode ===
									'notes'
										? 'bg-primary/20 text-primary border-primary/50'
										: 'bg-card/50 hover:bg-muted'} disabled:opacity-50"
									on:click={() =>
										(inputMode = inputMode === 'notes' ? 'value' : 'notes')}
									disabled={selectedIndices.length > 1}
									aria-label={inputMode === 'notes' ? 'Notes on' : 'Notes off'}
									title={inputMode === 'notes' ? 'Notes on' : 'Notes off'}
								>
									<span class="material-symbols-outlined text-[20px]">edit</span>
								</button>

								<button
									type="button"
									class="btn-glow inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 bg-card/50 transition-all hover:bg-muted disabled:opacity-50"
									on:click={autoGenerateNotes}
									disabled={solved}
									aria-label="Auto-generate notes"
									title="Auto-generate notes"
								>
									<span class="material-symbols-outlined text-[20px]"
										>auto_fix_high</span
									>
								</button>

								<button
									type="button"
									class="btn-glow inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 bg-card/50 transition-all hover:bg-muted disabled:opacity-50"
									on:click={clearAllNotes}
									disabled={solved}
									aria-label="Clear all notes"
									title="Clear all notes"
								>
									<span class="material-symbols-outlined text-[20px]"
										>clear_all</span
									>
								</button>

								<button
									type="button"
									class="btn-glow inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 bg-card/50 transition-all hover:bg-muted disabled:opacity-50"
									on:click={() => {
										updateHint();
										if (currentHint) {
											hintModalOpen = true;
											highlightedCells = new Set(currentHint.affectedCells);
										}
									}}
									disabled={!currentHint || solved}
									aria-label="Get hint"
									title="Get hint"
								>
									<span class="material-symbols-outlined text-[20px]"
										>lightbulb</span
									>
								</button>

								<button
									type="button"
									class="btn-glow inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 bg-card/50 transition-all hover:bg-muted disabled:opacity-50"
									on:click={toggleNoteLayout}
									disabled={!hasSelection}
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
											<circle cx="8" cy="8" r="1" fill="currentColor" />
											<circle cx="16" cy="8" r="1" fill="currentColor" />
											<circle cx="8" cy="16" r="1" fill="currentColor" />
											<circle cx="16" cy="16" r="1" fill="currentColor" />
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
											<circle cx="12" cy="12" r="2" fill="currentColor" />
										</svg>
									{/if}
								</button>
							</div>
						</div>
					</div>

					<!-- Number pad - always visible -->
					<div class="grid grid-cols-5 gap-1.5 sm:gap-2">
						{#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as n}
							<button
								type="button"
								class="glass-panel btn-glow relative rounded-lg py-1.5 sm:py-2 text-lg font-semibold transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
								disabled={remainingByDigit[n] <= 0}
								on:click={() => setValue(n)}
							>
								{n}
								{#if remainingByDigit[n] > 0 && remainingByDigit[n] < 9}
									<span
										class="absolute right-1 top-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-medium text-primary"
									>
										{remainingByDigit[n]}
									</span>
								{/if}
							</button>
						{/each}
						<button
							type="button"
							class="glass-panel btn-glow flex items-center justify-center rounded-lg py-1.5 sm:py-2 transition-all hover:scale-[1.02]"
							on:click={clearCell}
							aria-label="Clear cell"
							title="Clear cell"
						>
							<span class="material-symbols-outlined text-[20px] sm:text-[24px]"
								>backspace</span
							>
						</button>
					</div>
				</div>

				{#if solved}
					<div
						class="mt-2 glass-panel rounded-lg p-3 text-sm text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
					>
						<span class="material-symbols-outlined text-[18px] align-middle mr-1"
							>celebration</span
						>
						Solved! Rate the puzzle.
					</div>
				{/if}
			</div>

			<!-- Right panel - hidden on mobile to prevent scrolling -->
			<div class="hidden lg:grid gap-4">
				<div class="glass-panel rounded-lg p-4 text-sm">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<div class="font-semibold">Progress</div>
						<div class="flex items-center gap-2">
							<button
								type="button"
								class="btn-glow inline-flex h-9 items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-3 py-2 transition-all hover:bg-muted {debuggerOpen
									? 'bg-primary/20 border-primary/50'
									: ''}"
								on:click={() => (debuggerOpen = !debuggerOpen)}
							>
								<span
									class="material-symbols-outlined text-[18px]"
									aria-hidden="true">bug_report</span
								>
								<span class="hidden sm:inline">Debugger</span>
							</button>
							<button
								type="button"
								class="btn-glow inline-flex h-9 items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-3 py-2 transition-all hover:bg-muted disabled:opacity-50"
								on:click={() => scheduleSave()}
								disabled={!$userStore}
							>
								<span
									class="material-symbols-outlined text-[18px]"
									aria-hidden="true">save</span
								>
								<span class="hidden sm:inline">Save</span>
							</button>
							<button
								type="button"
								class="btn-glow inline-flex h-9 items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-3 py-2 transition-all hover:bg-muted disabled:opacity-50"
								on:click={() => (resetConfirmOpen = true)}
								disabled={!$userStore}
							>
								<span
									class="material-symbols-outlined text-[18px]"
									aria-hidden="true">history</span
								>
								<span class="hidden sm:inline">Reset</span>
							</button>
						</div>
					</div>
					<div class="mt-2 text-muted-foreground">
						Progress is saved locally and tied to your account if you're logged in.
					</div>
				</div>

				{#if debuggerOpen}
					<SolverDebugger
						{givens}
						{values}
						onStepChange={handleDebuggerStepChange}
						onHintChange={handleDebuggerHintChange}
						onGridStateChange={handleDebuggerGridStateChange}
					/>
				{/if}

				<div class="glass-panel rounded-lg p-4">
					<h2 class="font-semibold flex items-center gap-2">
						<span class="material-symbols-outlined text-[18px] text-primary">info</span>
						How it works
					</h2>
					<ul class="mt-2 space-y-1.5 text-sm text-muted-foreground">
						<li class="flex items-start gap-2">
							<span
								class="material-symbols-outlined text-[14px] mt-0.5 text-primary/60"
								>trending_up</span
							>
							Puzzles ranked by Wilson score on likes/dislikes
						</li>
						<li class="flex items-start gap-2">
							<span
								class="material-symbols-outlined text-[14px] mt-0.5 text-primary/60"
								>groups</span
							>
							Difficulty is community vote average
						</li>
						<li class="flex items-start gap-2">
							<span
								class="material-symbols-outlined text-[14px] mt-0.5 text-primary/60"
								>rate_review</span
							>
							Vote difficulty and like/dislike when done
						</li>
					</ul>
				</div>
			</div>
		</div>

		<Modal open={modalOpen}>
			<h2 class="text-xl font-semibold">Puzzle complete</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				Help the community: vote difficulty and rate it.
			</p>

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

		<Modal open={hintModalOpen}>
			<h2 class="text-lg font-semibold">Hint</h2>
			{#if currentHintSequence.length > 0}
				<div class="mt-4 space-y-3">
					{#each currentHintSequence as hint, idx}
						<div class="rounded-md border border-border bg-muted/50 p-3">
							<div class="mb-1 flex items-center gap-2 text-xs">
								<span class="font-semibold">Step {idx + 1}</span>
								<span class="text-muted-foreground"
									>{hint.technique.replace(/_/g, ' ')}</span
								>
								<span class="text-muted-foreground"
									>(Difficulty {hint.difficulty})</span
								>
							</div>
							<p class="text-sm text-muted-foreground">{hint.message}</p>
							{#if hint.solvedCells && hint.solvedCells.length > 0}
								<div class="mt-2 text-xs font-medium text-emerald-600">
									Will solve: {hint.solvedCells
										.map(
											(c: { index: number; value: number }) =>
												`R${Math.floor(c.index / 9) + 1}C${(c.index % 9) + 1}=${c.value}`,
										)
										.join(', ')}
								</div>
							{/if}
							{#if hint.eliminatedCandidates && hint.eliminatedCandidates.length > 0}
								<div class="mt-2 text-xs text-muted-foreground">
									Will eliminate: {hint.eliminatedCandidates
										.map(
											(e: { index: number; digit: number }) =>
												`R${Math.floor(e.index / 9) + 1}C${(e.index % 9) + 1}:${e.digit}`,
										)
										.join(', ')}
								</div>
							{/if}
						</div>
					{/each}
				</div>
				<div class="mt-4 flex items-center justify-end gap-2">
					<button
						type="button"
						class="rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-muted"
						on:click={() => {
							hintModalOpen = false;
							highlightedCells = new Set();
						}}
					>
						Cancel
					</button>
					<button
						type="button"
						class="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
						on:click={applyHint}
					>
						Apply All Hints ({currentHintSequence.length} step{currentHintSequence.length !==
						1
							? 's'
							: ''})
					</button>
				</div>
			{:else}
				<p class="mt-1 text-sm text-muted-foreground">No hints available.</p>
				<div class="mt-4 flex items-center justify-end gap-2">
					<button
						type="button"
						class="rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-muted"
						on:click={() => {
							hintModalOpen = false;
							highlightedCells = new Set();
						}}
					>
						Close
					</button>
				</div>
			{/if}
		</Modal>

		<Modal open={resetConfirmOpen}>
			<h2 class="text-lg font-semibold">Reset progress?</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				This clears your entered numbers and notes for this puzzle. Your givens remain.
			</p>
			<div class="mt-4 flex items-center justify-end gap-2">
				<button
					type="button"
					class="rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-muted"
					on:click={() => (resetConfirmOpen = false)}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
					on:click={() => {
						resetConfirmOpen = false;
						void resetProgress();
					}}
				>
					Reset
				</button>
			</div>
		</Modal>
	{/if}
</main>
