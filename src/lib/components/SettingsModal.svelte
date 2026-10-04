<script lang="ts">
	import Modal from './Modal.svelte';
	import AccountTab from './settings/AccountTab.svelte';
	import LibraryTab from './settings/LibraryTab.svelte';
	import PreferencesTab from './settings/PreferencesTab.svelte';
	import UsersTab from './settings/UsersTab.svelte';
	import type { Preferences } from '#lib/preferences.js';

	export type SettingsTab = 'preferences' | 'library' | 'users' | 'account';

	type Props = {
		/** Active tab, or null when closed. */
		tab: string | null;
		prefs: Preferences;
		user: { name: string; email: string; role?: string | null };
		ontab: (tab: SettingsTab) => void;
		onclose: () => void;
	};

	let { tab, prefs, user, ontab, onclose }: Props = $props();

	const isAdmin = $derived(user.role === 'admin');
	const tabs = $derived<{ id: SettingsTab; label: string }[]>([
		{ id: 'preferences', label: 'Preferences' },
		{ id: 'library', label: 'Library' },
		...(isAdmin ? [{ id: 'users' as const, label: 'Users' }] : []),
		{ id: 'account', label: 'Account' }
	]);

	const active = $derived<SettingsTab>(
		tab === 'account' || tab === 'library' || (tab === 'users' && isAdmin) ? tab : 'preferences'
	);
</script>

<Modal open={tab !== null} title="Settings" {onclose}>
	<div class="mb-4 flex gap-1 border-b border-border" role="tablist">
		{#each tabs as t (t.id)}
			<button
				type="button"
				role="tab"
				aria-selected={active === t.id}
				class="-mb-px border-b-2 px-3 py-2 text-sm font-medium {active === t.id
					? 'border-primary text-primary '
					: 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-white'}"
				onclick={() => ontab(t.id)}
			>
				{t.label}
			</button>
		{/each}
	</div>

	{#if active === 'preferences'}
		<PreferencesTab {prefs} />
	{:else if active === 'library'}
		<LibraryTab />
	{:else if active === 'users'}
		<UsersTab currentUserEmail={user.email} />
	{:else}
		<AccountTab name={user.name} email={user.email} />
	{/if}
</Modal>
