export const DIFFICULTY_LEVELS = [1, 2, 3, 4, 5] as const;

export type Difficulty = (typeof DIFFICULTY_LEVELS)[number];

export const difficultyLabel = (difficulty: number): string => {
	switch (difficulty) {
		case 1:
			return 'Easy';
		case 2:
			return 'Medium';
		case 3:
			return 'Hard';
		case 4:
			return 'Expert';
		case 5:
			return 'Master';
		default:
			return `D${difficulty}`;
	}
};

export const difficultyBadgeClass = (difficulty: number): string => {
	switch (difficulty) {
		case 1:
			return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200';
		case 2:
			return 'bg-lime-100 text-lime-900 dark:bg-lime-950/40 dark:text-lime-200';
		case 3:
			return 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200';
		case 4:
			return 'bg-orange-100 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200';
		case 5:
			return 'bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200';
		default:
			return 'bg-muted text-foreground/80';
	}
};
