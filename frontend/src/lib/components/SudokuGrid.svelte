<script lang="ts">
	import type { Grid } from '$lib/sudoku';

	export let givens: Grid;
	export let values: Grid;
	export let selectedIndex: number | null = null;
	export let onSelect: (index: number) => void;
</script>

<div class="grid grid-cols-9 overflow-hidden rounded-lg border border-slate-300 bg-white">
	{#each values as v, i}
		{@const row = Math.floor(i / 9)}
		{@const col = i % 9}
		<button
			type="button"
			class="flex aspect-square items-center justify-center border border-slate-200 text-lg outline-none focus:ring-2 focus:ring-slate-400
				{row % 3 === 2 && row !== 8 ? 'border-b-2 border-b-slate-300' : ''}
				{col % 3 === 2 && col !== 8 ? 'border-r-2 border-r-slate-300' : ''}
				{i === selectedIndex ? 'bg-slate-100' : ''}
				{givens[i] !== 0 ? 'font-semibold text-slate-900' : 'text-slate-700'}"
			on:click={() => onSelect(i)}
		>
			{#if v !== 0}
				{v}
			{/if}
		</button>
	{/each}
</div>

