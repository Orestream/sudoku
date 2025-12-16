import type {
	AuthResponse,
	MeResponse,
	MyPuzzlesResponse,
	ProgressResponse,
	PuzzleDetail,
	PuzzleListResponse,
	StatsResponse,
	ValidateResponse,
} from '$lib/types';

const PLAYER_ID_KEY = 'sudoku_player_id';

export const getPlayerId = (): string => {
	if (typeof localStorage === 'undefined') {
		return 'anonymous';
	}

	const existing = localStorage.getItem(PLAYER_ID_KEY);
	if (existing) {
		return existing;
	}

	const created = crypto.randomUUID();
	localStorage.setItem(PLAYER_ID_KEY, created);
	return created;
};

const request = async <T>(path: string, init?: RequestInit & { player?: boolean }): Promise<T> => {
	const headers = new Headers(init?.headers ?? {});
	if (init?.player) {
		headers.set('X-Player-Id', getPlayerId());
	}
	if (!headers.has('Content-Type') && init?.body) {
		headers.set('Content-Type', 'application/json; charset=utf-8');
	}

	const res = await fetch(`/api${path}`, {
		...init,
		headers,
		credentials: 'include',
	});

	if (!res.ok) {
		const data = (await res.json().catch(() => null)) as { error?: string } | null;
		throw new Error(data?.error ?? `http_${res.status}`);
	}

	return (await res.json()) as T;
};

export const listPuzzles = async (difficulty?: number | null): Promise<PuzzleListResponse> => {
	const qs = new URLSearchParams({
		sort: 'top',
		page: '1',
		pageSize: '50',
	});
	if (typeof difficulty === 'number' && Number.isFinite(difficulty)) {
		qs.set('difficulty', `${difficulty}`);
	}
	return request<PuzzleListResponse>(`/puzzles?${qs.toString()}`);
};

export const getPuzzle = async (id: number): Promise<PuzzleDetail> => {
	return request<PuzzleDetail>(`/puzzles/${id}`);
};

export const validatePuzzle = async (givens: string): Promise<ValidateResponse> => {
	return request<ValidateResponse>('/puzzles/validate', {
		method: 'POST',
		body: JSON.stringify({ givens }),
	});
};

export const createPuzzle = async (
	payload: {
		title?: string;
		givens?: string;
		creatorSuggestedDifficulty?: number;
	} = {},
): Promise<{ id: number }> => {
	const body = {
		title: payload.title,
		givens: payload.givens ?? '0'.repeat(81),
		creatorSuggestedDifficulty: payload.creatorSuggestedDifficulty ?? 1,
	};
	return request<{ id: number }>('/puzzles', {
		method: 'POST',
		body: JSON.stringify(body),
	});
};

export const updatePuzzle = async (
	id: number,
	payload: { title?: string; givens: string; creatorSuggestedDifficulty: number },
): Promise<PuzzleDetail> => {
	return request<PuzzleDetail>(`/puzzles/${id}`, {
		method: 'PUT',
		body: JSON.stringify(payload),
	});
};

export const publishPuzzle = async (id: number): Promise<PuzzleDetail> => {
	return request<PuzzleDetail>(`/puzzles/${id}/publish`, {
		method: 'POST',
	});
};

export const deletePuzzle = async (id: number): Promise<{ ok: boolean }> => {
	return request<{ ok: boolean }>(`/puzzles/${id}`, {
		method: 'DELETE',
	});
};

export const completePuzzle = async (
	id: number,
	payload: { timeMs: number; difficultyVote: number; liked: boolean | null },
): Promise<{ ok: boolean }> => {
	return request<{ ok: boolean }>(`/puzzles/${id}/complete`, {
		method: 'POST',
		player: true,
		body: JSON.stringify(payload),
	});
};

export const me = async (): Promise<MeResponse> => {
	return request<MeResponse>('/auth/me');
};

export const register = async (payload: {
	email: string;
	password: string;
	displayName?: string;
}): Promise<AuthResponse> => {
	return request<AuthResponse>('/auth/register', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
};

export const login = async (payload: {
	email: string;
	password: string;
}): Promise<AuthResponse> => {
	return request<AuthResponse>('/auth/login', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
};

export const logout = async (): Promise<{ ok: boolean }> => {
	return request<{ ok: boolean }>('/auth/logout', {
		method: 'POST',
	});
};

export const getStats = async (): Promise<StatsResponse> => {
	return request<StatsResponse>('/auth/stats');
};

export const listMyPuzzles = async (): Promise<MyPuzzlesResponse> => {
	return request<MyPuzzlesResponse>('/puzzles/mine');
};

export const getProgress = async (puzzleId: number): Promise<ProgressResponse | null> => {
	const res = await request<ProgressResponse | { progress: null }>(
		`/puzzles/${puzzleId}/progress`,
	);
	if ((res as { progress?: unknown }).progress === null) {
		return null;
	}
	return res as ProgressResponse;
};

export const saveProgress = async (
	puzzleId: number,
	payload: { values: string; cornerNotes: number[]; centerNotes: number[] },
): Promise<ProgressResponse> => {
	return request<ProgressResponse>(`/puzzles/${puzzleId}/progress`, {
		method: 'PUT',
		body: JSON.stringify(payload),
	});
};

export const clearProgress = async (puzzleId: number): Promise<{ ok: boolean }> => {
	return request<{ ok: boolean }>(`/puzzles/${puzzleId}/progress`, {
		method: 'DELETE',
	});
};
