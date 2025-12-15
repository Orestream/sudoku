<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { Grid } from '$lib/sudoku';

	export let givens: Grid;
	export let values: Grid;
	export let notes: number[] | undefined = undefined;
	export let notesLayout: 'corner' | 'center' = 'corner';
	export let selectedIndices: number[] = [];
	export let primaryIndex: number | null = null;
	export let onSelectionChange: (indices: number[], primary: number | null) => void = () => {};

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
		if (primaryIndex === null) {
			selectedDigit = null;
		} else if ((values[primaryIndex] ?? 0) !== 0) {
			selectedDigit = values[primaryIndex]!;
		} else {
			selectedDigit = digitFromSingleBitMask(notes?.[primaryIndex] ?? 0);
		}
	}

	let selectedSet = new Set<number>();
	$: selectedSet = new Set(selectedIndices);

	let pointerDown = false;
	let activePointerId: number | null = null;
	let activePointerType: string | null = null;
	let dragAdditive = false;
	let touchPending = false;
	let touchStartIndex = -1;
	let longPressTimer: number | null = null;
	let longPressFired = false;

	const clearLongPress = () => {
		if (longPressTimer !== null) {
			window.clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	};

	const emitSelection = (next: Set<number>, nextPrimary: number | null) => {
		const indices = Array.from(next);
		indices.sort((a, b) => a - b);
		onSelectionChange(indices, nextPrimary);
	};

	const selectOnly = (index: number) => {
		emitSelection(new Set([index]), index);
	};

	const toggleAdd = (index: number) => {
		const next = new Set(selectedSet);
		if (next.has(index)) {
			next.delete(index);
			const nextPrimary = next.size ? (primaryIndex === index ? Array.from(next).at(-1)! : primaryIndex) : null;
			emitSelection(next, nextPrimary);
			return;
		}
		next.add(index);
		emitSelection(next, index);
	};

	const addIndex = (index: number) => {
		if (selectedSet.has(index)) {
			return;
		}
		const next = new Set(selectedSet);
		next.add(index);
		emitSelection(next, index);
	};

	const onGlobalPointerUp = (e: PointerEvent) => {
		if (activePointerId !== null && e.pointerId !== activePointerId) {
			return;
		}

		if (touchPending && !longPressFired && touchStartIndex >= 0) {
			selectOnly(touchStartIndex);
		}

		pointerDown = false;
		activePointerId = null;
		activePointerType = null;
		dragAdditive = false;
		touchPending = false;
		touchStartIndex = -1;
		longPressFired = false;
		clearLongPress();
	};

	const indexFromPointerEvent = (e: PointerEvent): number | null => {
		const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
		const hit = el?.closest?.('[data-sudoku-index]') as HTMLElement | null;
		if (!hit) {
			return null;
		}
		const raw = hit.getAttribute('data-sudoku-index');
		if (!raw) {
			return null;
		}
		const n = Number(raw);
		return Number.isFinite(n) ? n : null;
	};

	const onGlobalPointerMove = (e: PointerEvent) => {
		if (!pointerDown) {
			return;
		}
		if (activePointerId !== null && e.pointerId !== activePointerId) {
			return;
		}

		const idx = indexFromPointerEvent(e);
		if (idx === null) {
			return;
		}

		clearLongPress();
		if (activePointerType === 'touch' && touchPending && !longPressFired) {
			touchPending = false;
			selectOnly(touchStartIndex);
		}
		addIndex(idx);
	};

	onMount(() => {
		window.addEventListener('pointerup', onGlobalPointerUp);
		window.addEventListener('pointercancel', onGlobalPointerUp);
		window.addEventListener('pointermove', onGlobalPointerMove);
	});

	onDestroy(() => {
		window.removeEventListener('pointerup', onGlobalPointerUp);
		window.removeEventListener('pointercancel', onGlobalPointerUp);
		window.removeEventListener('pointermove', onGlobalPointerMove);
		clearLongPress();
	});

	const onCellPointerDown = (e: PointerEvent, index: number) => {
		if (e.pointerType !== 'touch' && e.button !== 0) {
			return;
		}

		pointerDown = true;
		activePointerId = e.pointerId;
		activePointerType = e.pointerType;
		longPressFired = false;
		dragAdditive = Boolean((e as unknown as MouseEvent).ctrlKey || (e as unknown as MouseEvent).metaKey);

		const target = e.currentTarget as HTMLElement | null;
		target?.setPointerCapture?.(e.pointerId);

		if (e.pointerType === 'touch') {
			touchPending = true;
			touchStartIndex = index;
			clearLongPress();
			longPressTimer = window.setTimeout(() => {
				if (!pointerDown || activePointerId !== e.pointerId) {
					return;
				}
				longPressFired = true;
				touchPending = false;
				dragAdditive = true;
				toggleAdd(index);
			}, 420);
			return;
		}

		e.preventDefault();
		if (dragAdditive) {
			toggleAdd(index);
			return;
		}
		selectOnly(index);
	};

	const onCellPointerEnter = (index: number) => {
		if (!pointerDown) {
			return;
		}
		clearLongPress();

		if (activePointerType === 'touch' && touchPending && !longPressFired) {
			touchPending = false;
			selectOnly(touchStartIndex);
		}

		addIndex(index);
	};
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
		{@const isSelected = selectedSet.has(i)}
		{@const isPrimary = i === primaryIndex}
		{@const selectedRow = primaryIndex === null ? -1 : Math.floor(primaryIndex / 9)}
		{@const selectedCol = primaryIndex === null ? -1 : primaryIndex % 9}
		{@const selectedBox =
			primaryIndex === null
				? -1
				: Math.floor(selectedRow / 3) * 3 + Math.floor(selectedCol / 3)}
		{@const cellBox = Math.floor(row / 3) * 3 + Math.floor(col / 3)}
		{@const seesSelected =
			primaryIndex !== null &&
			!isPrimary &&
			(row === selectedRow || col === selectedCol || cellBox === selectedBox)}
		{@const matchesSelectedDigitInValue = selectedDigit !== null && v === selectedDigit && selectedDigit !== 0}
		{@const matchesSelectedDigitInNotes =
			selectedDigit !== null && v === 0 && (notesMask & (1 << (selectedDigit - 1))) !== 0}
		<button
			type="button"
			class="relative flex aspect-square touch-none select-none items-center justify-center overflow-hidden border border-border text-xl outline-none transition-transform duration-100
				{row % 3 === 2 && row !== 8 ? 'border-b-2 border-b-foreground/30' : ''}
				{col % 3 === 2 && col !== 8 ? 'border-r-2 border-r-foreground/30' : ''}
				{isSelected ? 'bg-foreground/10' : (seesSelected || matchesSelectedDigitInValue || matchesSelectedDigitInNotes) ? 'bg-foreground/5' : ''}
				{isPrimary ? 'z-10 scale-[1.02] shadow-[inset_0_0_0_2px_hsl(var(--ring))]' : isSelected ? 'shadow-[inset_0_0_0_1px_hsl(var(--ring))]' : matchesSelectedDigitInValue ? 'shadow-[inset_0_0_0_1px_hsl(var(--ring))]' : ''}
				{givens[i] !== 0 ? 'font-semibold text-foreground' : 'font-normal text-foreground/80 dark:text-foreground/85'}"
			data-sudoku-index={i}
			on:pointerdown={(e) => onCellPointerDown(e, i)}
			on:pointerenter={() => onCellPointerEnter(i)}
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
