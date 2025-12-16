export const DIFFICULTY_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export type Difficulty = (typeof DIFFICULTY_LEVELS)[number];

export const difficultyLabel = (difficulty: number): string => {
	switch (difficulty) {
		case 1:
			return 'Beginner';
		case 2:
			return 'Easy';
		case 3:
			return 'Medium';
		case 4:
			return 'Medium-Hard';
		case 5:
			return 'Hard';
		case 6:
			return 'Very Hard';
		case 7:
			return 'Expert';
		case 8:
			return 'Expert+';
		case 9:
			return 'Master';
		case 10:
			return 'Grandmaster';
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
			return 'bg-yellow-100 text-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-200';
		case 4:
			return 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200';
		case 5:
			return 'bg-orange-100 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200';
		case 6:
			return 'bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200';
		case 7:
			return 'bg-pink-100 text-pink-900 dark:bg-pink-950/40 dark:text-pink-200';
		case 8:
			return 'bg-purple-100 text-purple-900 dark:bg-purple-950/40 dark:text-purple-200';
		case 9:
			return 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200';
		case 10:
			return 'bg-slate-100 text-slate-900 dark:bg-slate-950/40 dark:text-slate-200';
		default:
			return 'bg-muted text-foreground/80';
	}
};
