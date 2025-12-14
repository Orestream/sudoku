import type { PuzzleDetail, PuzzleListResponse, UInt, ValidateResponse } from '$lib/types';

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

const request = async <T>(
	path: string,
	init?: RequestInit & { player?: boolean }
): Promise<T> => {
	const headers = new Headers(init?.headers ?? {});
	if (init?.player) {
		headers.set('X-Player-Id', getPlayerId());
	}
	if (!headers.has('Content-Type') && init?.body) {
		headers.set('Content-Type', 'application/json; charset=utf-8');
	}

	const res = await fetch(`/api${path}`, {
		...init,
		headers
	});

	if (!res.ok) {
		const data = (await res.json().catch(() => null)) as { error?: string } | null;
		throw new Error(data?.error ?? `http_${res.status}`);
	}

	return (await res.json()) as T;
};

export const listPuzzles = async (difficulty: number): Promise<PuzzleListResponse> => {
	const qs = new URLSearchParams({
		difficulty: `${difficulty}`,
		sort: 'top',
		page: '1',
		pageSize: '50'
	});
	return request<PuzzleListResponse>(`/puzzles?${qs.toString()}`);
};

export const getPuzzle = async (id: UInt): Promise<PuzzleDetail> => {
	return request<PuzzleDetail>(`/puzzles/${id}`);
};

export const validatePuzzle = async (givens: string): Promise<ValidateResponse> => {
	return request<ValidateResponse>('/puzzles/validate', {
		method: 'POST',
		body: JSON.stringify({ givens })
	});
};

export const createPuzzle = async (payload: {
	title?: string;
	givens: string;
	creatorSuggestedDifficulty: number;
}): Promise<{ id: UInt }> => {
	return request<{ id: UInt }>('/puzzles', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
};

export const completePuzzle = async (
	id: UInt,
	payload: { timeMs: number; difficultyVote: number; liked: boolean | null }
): Promise<{ ok: boolean }> => {
	return request<{ ok: boolean }>(`/puzzles/${id}/complete`, {
		method: 'POST',
		player: true,
		body: JSON.stringify(payload)
	});
};
