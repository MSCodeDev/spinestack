import type { Theme } from '../preferences.js';

/** The active theme setting, so components such as the toaster can follow it. */
export const themeState = $state<{ theme: Theme }>({ theme: 'system' });
