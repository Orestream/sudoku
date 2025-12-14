<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { login, register } from '$lib/api';
	import { refreshSession } from '$lib/session';

	let mode: 'login' | 'register' = 'login';
	let email = '';
	let password = '';
	let displayName = '';
	let loading = false;
	let error: string | null = null;

	const submit = async () => {
		loading = true;
		error = null;
		try {
			if (mode === 'register') {
				await register({
					email,
					password,
					displayName: displayName.trim() ? displayName.trim() : undefined
				});
			} else {
				await login({ email, password });
			}
			await refreshSession();
			const next = $page.url.searchParams.get('next') ?? '/';
			await goto(next);
		} catch (e) {
			error = e instanceof Error ? e.message : 'failed';
		} finally {
			loading = false;
		}
	};
</script>

<main class="mx-auto max-w-md p-6">
	<div class="rounded-xl border border-border bg-card p-6 shadow-sm">
		<div class="flex items-center justify-between gap-2">
			<h1 class="text-xl font-semibold">{mode === 'login' ? 'Log in' : 'Create account'}</h1>
			<button
				type="button"
				class="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
				on:click={() => (mode = mode === 'login' ? 'register' : 'login')}
			>
				{mode === 'login' ? 'Need an account?' : 'Already have one?'}
			</button>
		</div>

		<p class="mt-2 text-sm text-muted-foreground">
			Log in to save progress across devices and to create puzzles.
		</p>

		<form class="mt-6 grid gap-4" on:submit|preventDefault={submit}>
			{#if mode === 'register'}
				<label class="grid gap-1 text-sm">
					<span class="text-muted-foreground">Display name (optional)</span>
					<input
						class="rounded-md border border-input bg-background px-3 py-2"
						bind:value={displayName}
						autocomplete="nickname"
						placeholder="Robin"
					/>
				</label>
			{/if}

			<label class="grid gap-1 text-sm">
				<span class="text-muted-foreground">Email</span>
				<input
					class="rounded-md border border-input bg-background px-3 py-2"
					bind:value={email}
					type="email"
					autocomplete="email"
					required
				/>
			</label>

			<label class="grid gap-1 text-sm">
				<span class="text-muted-foreground">Password</span>
				<input
					class="rounded-md border border-input bg-background px-3 py-2"
					bind:value={password}
					type="password"
					autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
					required
					minlength="8"
				/>
				{#if mode === 'register'}
					<span class="text-xs text-muted-foreground">Minimum 8 characters.</span>
				{/if}
			</label>

			{#if error}
				<div
					class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200"
				>
					{error}
				</div>
			{/if}

			<button
				type="submit"
				class="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
				disabled={loading}
			>
				<span class="material-symbols-outlined text-[18px]" aria-hidden="true">
					{mode === 'login' ? 'login' : 'person_add'}
				</span>
				{loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
			</button>
		</form>

		<div class="mt-4 text-xs text-muted-foreground">
			OAuth (Google, etc.) is planned but not implemented yet.
		</div>
	</div>
</main>

