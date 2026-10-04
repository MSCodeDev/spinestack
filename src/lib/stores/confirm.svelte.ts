type Request = { message: string; confirmLabel: string; resolve: (ok: boolean) => void };

export const confirmState = $state<{ current: Request | null }>({ current: null });

export function confirm(message: string, confirmLabel = 'Delete') {
	return new Promise<boolean>((resolve) => {
		confirmState.current = { message, confirmLabel, resolve };
	});
}
