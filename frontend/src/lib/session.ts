import { writable } from 'svelte/store';
import type { User } from '$lib/types';
import { logout as apiLogout, me } from '$lib/api';

export const user = writable<User | null>(null);
export const sessionLoading = writable<boolean>(true);

export const refreshSession = async (): Promise<User | null> => {
	sessionLoading.set(true);
	try {
		const res = await me();
		user.set(res.user);
		return res.user;
	} finally {
		sessionLoading.set(false);
	}
};

export const logout = async (): Promise<void> => {
	await apiLogout();
	user.set(null);
};
