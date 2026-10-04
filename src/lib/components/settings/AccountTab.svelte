<script lang="ts">
	import { RefreshCw } from '@lucide/svelte';
	import { invalidateAll } from '$app/navigation';
	import Avatar from '#lib/components/Avatar.svelte';
	import { api } from '#lib/client/api.js';
	import { toast } from '#lib/stores/toast.svelte.js';

	let { name, email, avatarSeed }: { name: string; email: string; avatarSeed: string } = $props();

	let displayName = $derived(name);
	let current = $state('');
	let next = $state('');
	let confirm = $state('');
	let nameError = $state<string | null>(null);
	let passwordError = $state<string | null>(null);

	// Shown straight away; the saved preference catches up after the refresh.
	let pending = $state<string | null>(null);
	const shownSeed = $derived(pending ?? avatarSeed);

	async function regenerateAvatar() {
		const seed = crypto.randomUUID();
		pending = seed;
		try {
			await api('/api/settings/preferences', 'PUT', { avatarSeed: seed });
			await invalidateAll();
			toast('New avatar generated');
		} catch (err) {
			toast(err instanceof Error ? err.message : 'Could not save the avatar', 'error');
		} finally {
			pending = null;
		}
	}

	async function saveName(e: SubmitEvent) {
		e.preventDefault();
		nameError = null;
		try {
			await api('/api/settings/account', 'PATCH', { name: displayName });
			await invalidateAll();
			toast('Name updated');
		} catch (err) {
			nameError = err instanceof Error ? err.message : 'Could not update the name.';
		}
	}

	async function savePassword(e: SubmitEvent) {
		e.preventDefault();
		passwordError = null;
		if (next !== confirm) {
			passwordError = 'The new passwords do not match.';
			return;
		}
		try {
			await api('/api/settings/password', 'POST', { currentPassword: current, newPassword: next });
			current = next = confirm = '';
			toast('Password changed');
		} catch (err) {
			passwordError = err instanceof Error ? err.message : 'Could not change the password.';
		}
	}
</script>

<div class="space-y-8 text-sm">
	<form class="space-y-3" onsubmit={saveName}>
		<h3 class="font-display text-2xl leading-none font-bold">Profile</h3>
		<div class="flex items-center gap-4">
			<Avatar seed={shownSeed} class="size-20 shadow-sm ring-1 ring-border" />
			<div class="space-y-2">
				<p class="text-muted-foreground">{email}</p>
				<button type="button" class="btn border border-border" onclick={regenerateAvatar}>
					<RefreshCw size={16} /> Regenerate avatar
				</button>
			</div>
		</div>
		<label class="block font-medium">
			Name
			<input class="input" bind:value={displayName} required />
		</label>
		{#if nameError}<p class="text-destructive" role="alert">{nameError}</p>{/if}
		<button class="btn btn-primary">Save name</button>
	</form>

	<form class="space-y-3" onsubmit={savePassword}>
		<h3 class="font-display text-2xl leading-none font-bold">Change password</h3>
		<label class="block font-medium">
			Current password
			<input
				class="input"
				type="password"
				bind:value={current}
				required
				autocomplete="current-password"
			/>
		</label>
		<label class="block font-medium">
			New password
			<input
				class="input"
				type="password"
				bind:value={next}
				required
				minlength="8"
				autocomplete="new-password"
			/>
		</label>
		<label class="block font-medium">
			Confirm new password
			<input
				class="input"
				type="password"
				bind:value={confirm}
				required
				minlength="8"
				autocomplete="new-password"
			/>
		</label>
		{#if passwordError}<p class="text-destructive" role="alert">{passwordError}</p>{/if}
		<button class="btn btn-primary">Change password</button>
	</form>

	<form method="post" action="/logout">
		<button class="btn border border-border">Sign out</button>
	</form>
</div>
