<script lang="ts">
	import SudokuGrid from '$lib/components/SudokuGrid.svelte';
	import { DIFFICULTY_LEVELS } from '$lib/difficulty';
	import { createPuzzle, validatePuzzle } from '$lib/api';
	import { emptyGrid, gridToGivensString } from '$lib/sudoku';
	import type { ValidateResponse } from '$lib/types';

	let title = '';
	let suggestedDifficulty = DIFFICULTY_LEVELS[0];

	let givens = emptyGrid();
	let values = givens;
	let selectedIndex: number | null = null;

	let validating = false;
	let validation: ValidateResponse | null = null;
	let validateError: string | null = null;

	let creating = false;
	let createError: string | null = null;
	let createdId: number | null = null;

	const setValue = (value: number) => {
		if (selectedIndex === null) {
			return;
		}
		values = values.map((v, i) => (i === selectedIndex ? value : v));
	};

	const validate = async () => {
		validating = true;
		validateError = null;
		validation = null;
		createdId = null;
		try {
			const givensString = gridToGivensString(values);
			validation = await validatePuzzle(givensString);
		} catch (e) {
			validateError = e instanceof Error ? e.message : 'failed';
		} finally {
			validating = false;
		}
	};

	const submit = async () => {
		if (!validation?.unique || !validation?.solvable) {
			return;
		}
		creating = true;
		createError = null;
		createdId = null;
		try {
			const res = await createPuzzle({
				title: title.trim() ? title.trim() : undefined,
				givens: validation.normalized ?? gridToGivensString(values),
				creatorSuggestedDifficulty: suggestedDifficulty
			});
			createdId = res.id;
		} catch (e) {
			createError = e instanceof Error ? e.message : 'failed';
		} finally {
			creating = false;
		}
	};
</script>

<main class="mx-auto max-w-5xl p-6">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold">Create</h1>
			<p class="mt-1 text-sm text-slate-600">Build a puzzle, validate uniqueness, then submit.</p>
		</div>
		<a class="text-sm text-slate-600 underline" href="/">Home</a>
	</div>

	<div class="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
		<div>
			<SudokuGrid
				givens={emptyGrid()}
				values={values}
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
		</div>

		<div class="rounded-lg border border-slate-200 bg-white p-4">
			<div class="grid gap-4">
				<label class="flex flex-col gap-1 text-sm">
					<span class="text-slate-600">Title (optional)</span>
					<input
						class="rounded-md border border-slate-300 bg-white px-3 py-2"
						bind:value={title}
						placeholder="My first puzzle"
					/>
				</label>

				<label class="flex flex-col gap-1 text-sm">
					<span class="text-slate-600">Suggested difficulty</span>
					<select
						class="rounded-md border border-slate-300 bg-white px-3 py-2"
						bind:value={suggestedDifficulty}
					>
						{#each DIFFICULTY_LEVELS as d}
							<option value={d}>{d}</option>
						{/each}
					</select>
				</label>

				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						class="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
						disabled={validating}
						on:click={validate}
					>
						{validating ? 'Validating…' : 'Validate'}
					</button>
					<button
						type="button"
						class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 disabled:opacity-50"
						disabled
						title="Coming later: remove givens to increase difficulty using technique-based analysis."
					>
						Optimize difficulty (coming later)
					</button>
				</div>

				{#if validateError}
					<div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
						{validateError}
					</div>
				{/if}

				{#if validation}
					<div class="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
						<div>Valid: {validation.valid ? 'yes' : 'no'}</div>
						<div>Solvable: {validation.solvable ? 'yes' : 'no'}</div>
						<div>Unique: {validation.unique ? 'yes' : 'no'}</div>
						<div>Solutions: {validation.solutionCount}</div>
						{#if validation.errors?.length}
							<div class="mt-2 text-xs text-slate-600">{validation.errors.join(', ')}</div>
						{/if}
					</div>
				{/if}

				<button
					type="button"
					class="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
					disabled={!validation?.unique || !validation?.solvable || creating}
					on:click={submit}
				>
					{creating ? 'Submitting…' : 'Submit puzzle'}
				</button>

				{#if createError}
					<div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
						{createError}
					</div>
				{/if}

				{#if createdId !== null}
					<div class="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
						Created puzzle #{createdId}. <a class="underline" href={`/play/${createdId}`}>Play it</a>
					</div>
				{/if}
			</div>
		</div>
	</div>
</main>

