<script lang="ts">
	export let open = false;
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-black/40"></div>
		<div class="relative w-full max-w-lg rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg">
			<slot />
		</div>
	</div>
{/if}
