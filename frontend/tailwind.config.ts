import type { Config } from 'tailwindcss';

export default {
	darkMode: 'class',
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				background: 'hsl(var(--background) / <alpha-value>)',
				foreground: 'hsl(var(--foreground) / <alpha-value>)',
				card: 'hsl(var(--card) / <alpha-value>)',
				'card-foreground': 'hsl(var(--card-foreground) / <alpha-value>)',
				muted: 'hsl(var(--muted) / <alpha-value>)',
				'muted-foreground': 'hsl(var(--muted-foreground) / <alpha-value>)',
				border: 'hsl(var(--border) / <alpha-value>)',
				input: 'hsl(var(--input) / <alpha-value>)',
				ring: 'hsl(var(--ring) / <alpha-value>)',
				primary: 'hsl(var(--primary) / <alpha-value>)',
				'primary-foreground': 'hsl(var(--primary-foreground) / <alpha-value>)'
			}
		}
	},
	plugins: []
} satisfies Config;
