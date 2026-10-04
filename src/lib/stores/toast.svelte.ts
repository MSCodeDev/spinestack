import { toast as sonner } from 'svelte-sonner';

export function toast(message: string, kind: 'info' | 'error' = 'info') {
	if (kind === 'error') sonner.error(message);
	else sonner(message);
}
