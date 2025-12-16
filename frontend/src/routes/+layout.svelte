<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { logout as logoutSession, refreshSession, user as userStore } from '$lib/session';

	type Theme = 'light' | 'dark';
	const THEME_KEY = 'theme';
	let theme: Theme = 'light';
	let profileMenuOpen = false;

	const readStoredTheme = (): Theme | null => {
		const value = localStorage.getItem(THEME_KEY);
		return value === 'light' || value === 'dark' ? value : null;
	};

	const applyTheme = (next: Theme, opts?: { persist?: boolean }) => {
		theme = next;
		const root = document.documentElement;
		root.classList.toggle('dark', next === 'dark');
		root.dataset.theme = next;
		if (opts?.persist !== false) {
			localStorage.setItem(THEME_KEY, next);
		}
	};

	const toggleTheme = () => {
		applyTheme(theme === 'dark' ? 'light' : 'dark', { persist: true });
	};

	onMount(() => {
		void refreshSession();

		const stored = readStoredTheme();
		if (stored) {
			applyTheme(stored, { persist: false });
			return;
		}
		theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
	});

	const onLogout = async () => {
		await logoutSession();
		profileMenuOpen = false;
		await goto('/');
	};
</script>

<div class="min-h-screen bg-background text-foreground">
	<header
		class="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
	>
		<div class="mx-auto flex max-w-5xl items-center justify-between gap-4 p-4">
			<a class="text-lg font-semibold tracking-tight" href="/">Sudoku</a>

			<nav class="flex items-center gap-2 text-sm">
				<a
					class="rounded-md px-2 py-1 text-muted-foreground hover:text-foreground"
					href="/play"
				>
					Play
				</a>
				<a
					class="rounded-md px-2 py-1 text-muted-foreground hover:text-foreground"
					href="/my"
				>
					Your puzzles
				</a>

				<button
					type="button"
					class="ml-2 inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
					on:click={toggleTheme}
					aria-label="Toggle theme"
					title="Toggle theme"
				>
					{#if theme === 'dark'}
						<span class="material-symbols-outlined text-[20px]" aria-hidden="true"
							>dark_mode</span
						>
					{:else}
						<span class="material-symbols-outlined text-[20px]" aria-hidden="true"
							>light_mode</span
						>
					{/if}
				</button>

				<details class="relative" bind:open={profileMenuOpen}>
					<summary
						class="cursor-pointer ml-1 flex h-9 w-9 list-none items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground"
						aria-label="Profile"
						title="Profile"
					>
						<span class="material-symbols-outlined text-[20px]" aria-hidden="true"
							>account_circle</span
						>
					</summary>
					<div
						class="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-lg"
					>
						{#if $userStore}
							<div class="border-b border-border px-4 py-3">
								<div class="text-sm font-medium">Signed in</div>
								<div class="mt-0.5 truncate text-xs text-muted-foreground">
									{$userStore.email}
								</div>
							</div>
							<a
								class="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
								href="/profile"
								on:click={() => (profileMenuOpen = false)}
							>
								<span
									class="material-symbols-outlined text-[18px]"
									aria-hidden="true">bar_chart</span
								>
								Stats
							</a>
							<button
								type="button"
								class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-muted"
								on:click={onLogout}
							>
								<span
									class="material-symbols-outlined text-[18px]"
									aria-hidden="true">logout</span
								>
								Log out
							</button>
						{:else}
							<a
								class="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
								href="/login"
								on:click={() => (profileMenuOpen = false)}
							>
								<span
									class="material-symbols-outlined text-[18px]"
									aria-hidden="true">login</span
								>
								Log in
							</a>
						{/if}
					</div>
				</details>
			</nav>
		</div>
	</header>

	<slot />
</div>
