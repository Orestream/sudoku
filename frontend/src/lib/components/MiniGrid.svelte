<script lang="ts">
	export let givens: string;
</script>

<div class="glass-grid grid grid-cols-9 overflow-hidden rounded-lg">
	{#each Array.from(givens) as ch, i}
		{@const row = Math.floor(i / 9)}
		{@const col = i % 9}
		<div
			class="flex aspect-square items-center justify-center border border-border text-[10px] leading-none text-foreground/80
				{row % 3 === 2 && row !== 8 ? 'border-b-2 border-b-foreground/30' : ''}
				{col % 3 === 2 && col !== 8 ? 'border-r-2 border-r-foreground/30' : ''}"
		>
			{#if ch !== '0'}
				{ch}
			{/if}
		</div>
	{/each}
</div>
