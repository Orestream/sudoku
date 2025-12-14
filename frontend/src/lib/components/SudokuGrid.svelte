<script lang="ts">
	import type { Grid } from '$lib/sudoku';

	export let givens: Grid;
	export let values: Grid;
	export let notes: number[] | undefined = undefined;
	export let notesLayout: 'corner' | 'center' = 'corner';
	export let selectedIndex: number | null = null;
	export let onSelect: (index: number) => void;

	const maskToList = (mask: number): number[] => {
		const out: number[] = [];
		for (let n = 1; n <= 9; n++) {
			if (mask & (1 << (n - 1))) {
				out.push(n);
			}
		}
		return out;
	};

	const digitFromSingleBitMask = (mask: number): number | null => {
		if (mask === 0) {
			return null;
		}
		if ((mask & (mask - 1)) !== 0) {
			return null;
		}
		for (let n = 1; n <= 9; n++) {
			if (mask === 1 << (n - 1)) {
				return n;
			}
		}
		return null;
	};

	let selectedDigit: number | null = null;
	$: {
		if (selectedIndex === null) {
			selectedDigit = null;
		} else if ((values[selectedIndex] ?? 0) !== 0) {
			selectedDigit = values[selectedIndex]!;
		} else {
			selectedDigit = digitFromSingleBitMask(notes?.[selectedIndex] ?? 0);
		}
	}
</script>

<div class="grid grid-cols-9 overflow-hidden rounded-lg border border-input bg-card">
	{#each values as v, i}
		{@const row = Math.floor(i / 9)}
		{@const col = i % 9}
		{@const notesMask = notes?.[i] ?? 0}
		{@const notesList = notesLayout === 'center' ? maskToList(notesMask) : []}
		{@const notesCount = notesLayout === 'center' ? notesList.length : 0}
		{@const centerTextSize =
			notesCount > 8
				? 'text-[8px]'
				: notesCount > 6
					? 'text-[9px]'
					: notesCount > 4
						? 'text-[10px]'
						: 'text-[11px]'}
		{@const isSelected = i === selectedIndex}
		{@const selectedRow = selectedIndex === null ? -1 : Math.floor(selectedIndex / 9)}
		{@const selectedCol = selectedIndex === null ? -1 : selectedIndex % 9}
		{@const selectedBox =
			selectedIndex === null
				? -1
				: Math.floor(selectedRow / 3) * 3 + Math.floor(selectedCol / 3)}
		{@const cellBox = Math.floor(row / 3) * 3 + Math.floor(col / 3)}
		{@const seesSelected =
			selectedIndex !== null &&
			!isSelected &&
			(row === selectedRow || col === selectedCol || cellBox === selectedBox)}
		{@const matchesSelectedDigitInValue = selectedDigit !== null && v === selectedDigit && selectedDigit !== 0}
		{@const matchesSelectedDigitInNotes =
			selectedDigit !== null && v === 0 && (notesMask & (1 << (selectedDigit - 1))) !== 0}
		<button
			type="button"
			class="relative flex aspect-square items-center justify-center overflow-hidden border border-border text-xl outline-none transition-transform duration-100
				{row % 3 === 2 && row !== 8 ? 'border-b-2 border-b-foreground/30' : ''}
				{col % 3 === 2 && col !== 8 ? 'border-r-2 border-r-foreground/30' : ''}
				{isSelected ? 'bg-foreground/10' : (seesSelected || matchesSelectedDigitInValue || matchesSelectedDigitInNotes) ? 'bg-foreground/5' : ''}
				{matchesSelectedDigitInValue && !isSelected ? 'shadow-[inset_0_0_0_1px_hsl(var(--ring))]' : ''}
				{isSelected ? 'z-10 scale-[1.02] shadow-[inset_0_0_0_2px_hsl(var(--ring))]' : ''}
				{givens[i] !== 0 ? 'font-semibold text-foreground' : 'font-normal text-foreground/80 dark:text-foreground/85'}"
			on:click={() => onSelect(i)}
		>
			{#if v !== 0}
				{v}
			{:else}
				{#if notesMask !== 0}
					{#if notesLayout === 'center'}
						<div
							class={`absolute inset-0 flex flex-wrap items-center justify-center gap-x-0.5 gap-y-0 p-0.5 leading-none text-muted-foreground ${centerTextSize}`}
						>
							{#each notesList as n}
								<span
									class={selectedDigit === n
										? 'inline-flex items-center justify-center rounded-[4px] px-1 py-0.5 leading-none text-foreground shadow-[inset_0_0_0_1px_hsl(var(--ring))]'
										: ''}
								>
									{n}
								</span>
							{/each}
						</div>
					{:else}
						<div class="absolute inset-0 grid grid-cols-3 p-0.5 text-[9px] leading-none text-muted-foreground">
							{#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as n}
								<div class="flex items-center justify-center">
									{#if notesMask & (1 << (n - 1))}
										<span
											class={selectedDigit === n
												? 'inline-flex items-center justify-center rounded-[4px] px-1 py-0.5 leading-none text-foreground shadow-[inset_0_0_0_1px_hsl(var(--ring))]'
												: ''}
										>
											{n}
										</span>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				{/if}
			{/if}
		</button>
	{/each}
</div>
