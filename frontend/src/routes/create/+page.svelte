<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { createPuzzle } from '$lib/api';
	import { user as userStore } from '$lib/session';

	let creating = false;
	let error: string | null = null;

	const startNew = async () => {
		if (!$userStore) {
			await goto('/login?next=/my');
			return;
		}
		creating = true;
		error = null;
		try {
			const res = await createPuzzle();
			await goto(`/edit/${res.id}`);
		} catch (e) {
			error = e instanceof Error ? e.message : 'failed';
		} finally {
			creating = false;
		}
	};

	onMount(() => {
		void startNew();
	});
</script>

<main class="mx-auto max-w-xl p-6">
	<h1 class="text-2xl font-semibold">New puzzle</h1>
	<p class="mt-1 text-sm text-muted-foreground">
		Creating a private draft and opening the editor…
	</p>

	{#if !$userStore}
		<div class="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
			<div class="text-sm text-muted-foreground">Log in to create puzzles.</div>
			<button
				type="button"
				class="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
				on:click={() => goto('/login?next=/my')}
			>
				<span class="material-symbols-outlined text-[18px]" aria-hidden="true">login</span>
				Log in
			</button>
		</div>
	{:else}
		<div class="mt-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
			{#if creating}
				<div class="flex items-center gap-2">
					<span
						class="material-symbols-outlined animate-spin text-[18px]"
						aria-hidden="true">progress_activity</span
					>
					Creating draft…
				</div>
			{:else if error}
				<div class="flex flex-col gap-2">
					<div class="text-red-600 dark:text-red-300">{error}</div>
					<button
						type="button"
						class="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground shadow-sm hover:bg-primary/90"
						on:click={startNew}
					>
						<span class="material-symbols-outlined text-[18px]" aria-hidden="true"
							>refresh</span
						>
						Try again
					</button>
				</div>
			{/if}
		</div>
	{/if}
</main>
