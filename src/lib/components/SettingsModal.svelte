<script lang="ts">
	import Modal from './Modal.svelte';
	import SegmentedTabs from './SegmentedTabs.svelte';
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
	<SegmentedTabs {tabs} value={active} onchange={ontab} />

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
