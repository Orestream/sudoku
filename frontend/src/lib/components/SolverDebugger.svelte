<script lang="ts">
	import { TechniqueSolver } from '../solver/solver';
	import { SolverGrid } from '../solver/grid';
	import { applyTechnique } from '../solver/techniques';
	import type { SolveStep, Hint } from '../solver/types';
	import type { Grid } from '../sudoku';

	export let givens: Grid;
	export let values: Grid;
	export let onStepChange: ((step: SolveStep | null) => void) | undefined = undefined;
	export let onHintChange: ((hint: Hint | null) => void) | undefined = undefined;
	export let onGridStateChange:
		| ((gridValues: Grid, gridNotes: number[], highlightedIndices: number[]) => void)
		| undefined = undefined;

	let solver: TechniqueSolver | null = null;
	let currentStepIndex = -1;
	let steps: SolveStep[] = [];
	let currentHint: Hint | null = null;
	let autoSolving = false;
	let autoSolveInterval: number | null = null;
	let debuggerGridValues: Grid = [...values];
	let debuggerGridNotes: number[] = Array.from({ length: 81 }, () => 0);
	let baseValues: Grid = [...values]; // Track the base state (user's current values)

	$: {
		if (givens && values) {
			initializeSolver();
		}
	}

	function initializeSolver() {
		baseValues = [...values]; // Update base values when initializing
		solver = new TechniqueSolver([...values], givens);
		steps = [];
		currentStepIndex = -1;
		currentHint = null;
		stopAutoSolve();
		updateHint();
		updateGridState();
	}

	function updateGridState() {
		if (!solver) {
			return;
		}

		// Create a fresh grid starting from the base values (user's current state when debugger was opened)
		// This preserves user progress and shows solver steps on top of it
		const grid = new SolverGrid([...baseValues], givens);

		// Apply all steps up to currentStepIndex sequentially
		// Each step builds on the previous step's result
		for (let i = 0; i <= currentStepIndex && i < steps.length; i++) {
			const step = steps[i]!;
			// Only apply if the cell is still empty (preserve values set in previous steps)
			if (step.solvedCells) {
				for (const cell of step.solvedCells) {
					// Only set if the cell is currently empty (0)
					if (grid.getValue(cell.index) === 0) {
						grid.setValue(cell.index, cell.value);
					}
				}
			}
			if (step.eliminatedCandidates) {
				for (const elim of step.eliminatedCandidates) {
					// Only eliminate if the cell is still empty
					if (grid.getValue(elim.index) === 0) {
						grid.eliminateCandidate(elim.index, elim.digit);
					}
				}
			}
		}

		// Get current grid state
		debuggerGridValues = grid.getValues();
		debuggerGridNotes = Array.from({ length: 81 }, (_, i) => {
			if (debuggerGridValues[i] !== 0) {
				return 0;
			}
			return grid.getCandidates(i);
		});

		// Calculate highlighted indices from current step
		const highlightedIndices: number[] = [];
		if (currentStepIndex >= 0 && currentStepIndex < steps.length) {
			const step = steps[currentStepIndex]!;
			if (step.affectedCells) {
				highlightedIndices.push(...step.affectedCells);
			}
			if (step.solvedCells) {
				highlightedIndices.push(...step.solvedCells.map((c) => c.index));
			}
			if (step.eliminatedCandidates) {
				highlightedIndices.push(...step.eliminatedCandidates.map((e) => e.index));
			}
		}

		if (onGridStateChange) {
			onGridStateChange(debuggerGridValues, debuggerGridNotes, highlightedIndices);
		}
	}

	function updateHint() {
		if (!solver) {
			return;
		}
		currentHint = solver.getNextHint();
		if (onHintChange) {
			onHintChange(currentHint);
		}
	}

	function nextStep() {
		if (!solver) {
			return;
		}
		const result = solver.solveStep();
		if (result) {
			steps = solver.getSteps();
			currentStepIndex = steps.length - 1;
			updateHint();
			updateGridState();
			if (onStepChange && steps.length > 0) {
				onStepChange(steps[currentStepIndex]!);
			}
		}
	}

	function previousStep() {
		if (currentStepIndex >= 0) {
			currentStepIndex--;
			updateGridState();
			if (currentStepIndex >= 0 && onStepChange) {
				onStepChange(steps[currentStepIndex]!);
			} else if (onStepChange) {
				onStepChange(null);
			}
		}
	}

	function reset() {
		if (!solver) {
			return;
		}
		solver.reset();
		steps = [];
		currentStepIndex = -1;
		currentHint = null;
		stopAutoSolve();
		updateHint();
		updateGridState();
		if (onStepChange) {
			onStepChange(null);
		}
	}

	function toggleAutoSolve() {
		if (autoSolving) {
			stopAutoSolve();
		} else {
			startAutoSolve();
		}
	}

	function startAutoSolve() {
		if (!solver) {
			return;
		}
		autoSolving = true;
		autoSolveInterval = window.setInterval(() => {
			if (!solver) {
				stopAutoSolve();
				return;
			}
			if (solver.canSolveStep() && !solver.getGrid().isSolved()) {
				nextStep();
			} else {
				stopAutoSolve();
			}
		}, 500); // Step every 500ms
	}

	function stopAutoSolve() {
		autoSolving = false;
		if (autoSolveInterval !== null) {
			window.clearInterval(autoSolveInterval);
			autoSolveInterval = null;
		}
	}

	function getCurrentStep(): SolveStep | null {
		if (currentStepIndex >= 0 && currentStepIndex < steps.length) {
			return steps[currentStepIndex]!;
		}
		return null;
	}

	function getTechniqueName(technique: string): string {
		const names: Record<string, string> = {
			naked_single: 'Naked Single',
			hidden_single: 'Hidden Single',
			pointing_pair: 'Pointing Pair',
			box_line_reduction: 'Box-Line Reduction',
		};
		return names[technique] ?? technique;
	}

	function getDifficultyColor(difficulty: number): string {
		switch (difficulty) {
			case 1:
				return 'text-emerald-600';
			case 2:
				return 'text-lime-600';
			case 3:
				return 'text-amber-600';
			case 4:
				return 'text-orange-600';
			case 5:
				return 'text-red-600';
			default:
				return 'text-muted-foreground';
		}
	}

	$: log = solver ? solver.getLog() : null;
</script>

<div class="rounded-lg border border-border bg-card p-4">
	<div class="mb-4 flex items-center justify-between">
		<h3 class="text-lg font-semibold">Solver Debugger</h3>
		<button
			type="button"
			class="rounded-md border border-input bg-card px-2 py-1 text-sm hover:bg-muted"
			on:click={reset}
		>
			Reset
		</button>
	</div>

	<div class="mb-4 flex flex-wrap gap-2">
		<button
			type="button"
			class="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm transition hover:bg-muted disabled:opacity-50"
			on:click={previousStep}
			disabled={currentStepIndex < 0 || autoSolving}
		>
			<span class="material-symbols-outlined text-[18px]" aria-hidden="true">skip_previous</span>
			Previous
		</button>
		<button
			type="button"
			class="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm transition hover:bg-muted disabled:opacity-50"
			on:click={nextStep}
			disabled={!solver?.canSolveStep() || solver?.getGrid().isSolved() || autoSolving}
		>
			<span class="material-symbols-outlined text-[18px]" aria-hidden="true">skip_next</span>
			Next Step
		</button>
		<button
			type="button"
			class="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm transition hover:bg-muted disabled:opacity-50 {autoSolving
				? 'bg-muted'
				: ''}"
			on:click={toggleAutoSolve}
			disabled={!solver?.canSolveStep() || solver?.getGrid().isSolved()}
		>
			<span class="material-symbols-outlined text-[18px]" aria-hidden="true"
				>{autoSolving ? 'pause' : 'play_arrow'}</span
			>
			{autoSolving ? 'Pause' : 'Auto Solve'}
		</button>
	</div>

	{#if getCurrentStep()}
		<div class="mb-4 rounded-md border border-border bg-muted/50 p-3">
			<div class="mb-2 flex items-center gap-2">
				<span class="font-semibold">Step {getCurrentStep()!.stepNumber}</span>
				<span class="text-xs text-muted-foreground">
					{getTechniqueName(getCurrentStep()!.technique)}
				</span>
				<span class={`text-xs font-medium ${getDifficultyColor(getCurrentStep()!.difficulty)}`}>
					Difficulty {getCurrentStep()!.difficulty}
				</span>
			</div>
			<p class="text-sm text-muted-foreground">{getCurrentStep()!.message}</p>
			{#if getCurrentStep()!.solvedCells && getCurrentStep()!.solvedCells!.length > 0}
				<div class="mt-2 text-xs text-muted-foreground">
					Solved cells:
					{getCurrentStep()!.solvedCells!.map((c) => `R${Math.floor(c.index / 9) + 1}C${(c.index % 9) + 1}=${c.value}`).join(', ')}
				</div>
			{/if}
			{#if getCurrentStep()!.eliminatedCandidates && getCurrentStep()!.eliminatedCandidates!.length > 0}
				<div class="mt-2 text-xs text-muted-foreground">
					Eliminated candidates:
					{getCurrentStep()!.eliminatedCandidates!.map((e) => `R${Math.floor(e.index / 9) + 1}C${(e.index % 9) + 1}:${e.digit}`).join(', ')}
				</div>
			{/if}
		</div>
	{:else if currentHint}
		<div class="mb-4 rounded-md border border-primary/50 bg-primary/10 p-3">
			<div class="mb-2 flex items-center gap-2">
				<span class="font-semibold">Next Hint</span>
				<span class="text-xs text-muted-foreground">{getTechniqueName(currentHint.technique)}</span>
				<span class={`text-xs font-medium ${getDifficultyColor(currentHint.difficulty)}`}>
					Difficulty {currentHint.difficulty}
				</span>
			</div>
			<p class="text-sm text-muted-foreground">{currentHint.message}</p>
		</div>
	{:else if solver?.getGrid().isSolved()}
		<div class="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
			Puzzle solved! Total steps: {steps.length}
		</div>
	{:else if solver && !solver.canSolveStep()}
		<div class="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
			Solver stuck. No more techniques available.
		</div>
	{/if}

	<div class="text-xs text-muted-foreground">
		Total steps: {steps.length} | Current step: {currentStepIndex + 1}
	</div>

	{#if steps.length > 0}
		<div class="mt-4 max-h-48 overflow-y-auto rounded-md border border-border bg-muted/30 p-2">
			<div class="text-xs font-semibold text-muted-foreground">Step History</div>
			<div class="mt-2 space-y-1">
				{#each steps as step, idx}
					<button
						type="button"
						class="w-full cursor-pointer rounded px-2 py-1 text-left text-xs transition hover:bg-muted {idx ===
						currentStepIndex
							? 'bg-muted'
							: ''}"
						on:click={() => {
							currentStepIndex = idx;
							updateGridState();
							if (onStepChange) {
								onStepChange(step);
							}
						}}
					>
						<span class="font-mono">{step.stepNumber}.</span> {getTechniqueName(step.technique)}
						<span class="text-muted-foreground"> (D{step.difficulty})</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

