import type { Accent, Theme } from './preferences.js';
import { themeState } from './stores/theme.svelte.js';

/** Apply a theme to the page immediately, without a reload. */
export function applyTheme(theme: Theme) {
	const root = document.documentElement;
	root.dataset.theme = theme;
	themeState.theme = theme;
	const dark =
		theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
	root.classList.toggle('dark', dark);
}

/** Apply the main colour to the page immediately, without a reload. */
export const applyAccent = (accent: Accent) => {
	document.documentElement.dataset.accent = accent;
};
