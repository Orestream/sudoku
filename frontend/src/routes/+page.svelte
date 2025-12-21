<script lang="ts">
	// Custom SVG icons for Play and Create
</script>

<main class="mx-auto max-w-3xl p-6">
	<div class="text-center mt-8 mb-12">
		<h1
			class="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-[hsl(300,70%,50%)] bg-clip-text text-transparent"
		>
			Sudoku
		</h1>
		<p class="mt-4 text-lg text-muted-foreground">
			Play community puzzles or create your own masterpiece.
		</p>
	</div>

	<div class="grid gap-6 sm:grid-cols-2">
		<a
			class="hero-card group rounded-2xl p-8 flex flex-col items-center text-center"
			href="/play"
		>
			<!-- Custom Play SVG -->
			<div class="w-20 h-20 mb-5 relative">
				<svg
					viewBox="0 0 80 80"
					class="w-full h-full"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<!-- Sudoku grid background -->
					<rect
						x="8"
						y="8"
						width="64"
						height="64"
						rx="8"
						class="fill-muted/50 stroke-border"
						stroke-width="2"
					/>
					<!-- Grid lines -->
					<line x1="29" y1="8" x2="29" y2="72" class="stroke-border" stroke-width="1" />
					<line x1="51" y1="8" x2="51" y2="72" class="stroke-border" stroke-width="1" />
					<line x1="8" y1="29" x2="72" y2="29" class="stroke-border" stroke-width="1" />
					<line x1="8" y1="51" x2="72" y2="51" class="stroke-border" stroke-width="1" />
					<!-- Play triangle overlay -->
					<polygon
						points="32,24 32,56 56,40"
						class="fill-primary/80 group-hover:fill-primary transition-colors"
					/>
					<!-- Glow effect -->
					<circle cx="40" cy="40" r="20" class="fill-primary/20 animate-pulse" />
				</svg>
			</div>
			<div
				class="text-2xl font-semibold text-foreground group-hover:text-primary transition-colors"
			>
				Play
			</div>
			<div class="mt-2 text-sm text-muted-foreground">
				Choose a difficulty and challenge yourself with community puzzles.
			</div>
			<!-- Subtle arrow indicator -->
			<div
				class="mt-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all"
			>
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M5 12h14M12 5l7 7-7 7" />
				</svg>
			</div>
		</a>

		<a
			class="hero-card group rounded-2xl p-8 flex flex-col items-center text-center"
			href="/my"
		>
			<!-- Custom Create SVG -->
			<div class="w-20 h-20 mb-5 relative">
				<svg
					viewBox="0 0 80 80"
					class="w-full h-full"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<!-- Sudoku grid background -->
					<rect
						x="8"
						y="8"
						width="64"
						height="64"
						rx="8"
						class="fill-muted/50 stroke-border"
						stroke-width="2"
					/>
					<!-- Grid lines -->
					<line x1="29" y1="8" x2="29" y2="72" class="stroke-border" stroke-width="1" />
					<line x1="51" y1="8" x2="51" y2="72" class="stroke-border" stroke-width="1" />
					<line x1="8" y1="29" x2="72" y2="29" class="stroke-border" stroke-width="1" />
					<line x1="8" y1="51" x2="72" y2="51" class="stroke-border" stroke-width="1" />
					<!-- Pencil icon -->
					<g
						class="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
					>
						<path
							d="M28 52L48 32M48 32L52 28L56 32L52 36L48 32Z"
							class="stroke-primary fill-primary/20"
							stroke-width="3"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
						<circle cx="28" cy="52" r="3" class="fill-primary" />
					</g>
					<!-- Plus icon in corner -->
					<circle cx="60" cy="20" r="10" class="fill-primary/80" />
					<line
						x1="60"
						y1="15"
						x2="60"
						y2="25"
						stroke="white"
						stroke-width="2"
						stroke-linecap="round"
					/>
					<line
						x1="55"
						y1="20"
						x2="65"
						y2="20"
						stroke="white"
						stroke-width="2"
						stroke-linecap="round"
					/>
				</svg>
			</div>
			<div
				class="text-2xl font-semibold text-foreground group-hover:text-primary transition-colors"
			>
				Create
			</div>
			<div class="mt-2 text-sm text-muted-foreground">
				Design your own puzzles and share them with the community.
			</div>
			<!-- Subtle arrow indicator -->
			<div
				class="mt-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all"
			>
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M5 12h14M12 5l7 7-7 7" />
				</svg>
			</div>
		</a>
	</div>

	<!-- Decorative sudoku icon at bottom -->
	<div class="flex justify-center mt-16 opacity-20">
		<svg
			width="40"
			height="40"
			viewBox="0 0 40 40"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<rect
				x="2"
				y="2"
				width="36"
				height="36"
				rx="4"
				stroke="currentColor"
				stroke-width="2"
			/>
			<line x1="14" y1="2" x2="14" y2="38" stroke="currentColor" stroke-width="1" />
			<line x1="26" y1="2" x2="26" y2="38" stroke="currentColor" stroke-width="1" />
			<line x1="2" y1="14" x2="38" y2="14" stroke="currentColor" stroke-width="1" />
			<line x1="2" y1="26" x2="38" y2="26" stroke="currentColor" stroke-width="1" />
		</svg>
	</div>
</main>
