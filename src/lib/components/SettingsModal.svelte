<script lang="ts">
	import Modal from './Modal.svelte';
	import AccountTab from './settings/AccountTab.svelte';
	import PreferencesTab from './settings/PreferencesTab.svelte';
	import type { Preferences } from '#lib/preferences.js';

	export type SettingsTab = 'preferences' | 'account';

	type Props = {
		/** Active tab, or null when closed. */
		tab: string | null;
		prefs: Preferences;
		user: { name: string; email: string };
		ontab: (tab: SettingsTab) => void;
		onclose: () => void;
	};

	let { tab, prefs, user, ontab, onclose }: Props = $props();

	const tabs: { id: SettingsTab; label: string }[] = [
		{ id: 'preferences', label: 'Preferences' },
		{ id: 'account', label: 'Account' }
	];

	const active = $derived<SettingsTab>(tab === 'account' ? 'account' : 'preferences');
</script>

<Modal open={tab !== null} title="Settings" {onclose}>
	<div class="mb-4 flex gap-1 border-b border-stone-200 dark:border-stone-800" role="tablist">
		{#each tabs as t (t.id)}
			<button
				type="button"
				role="tab"
				aria-selected={active === t.id}
				class="-mb-px border-b-2 px-3 py-2 text-sm font-medium {active === t.id
					? 'border-indigo-600 text-indigo-700 dark:text-indigo-300'
					: 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-white'}"
				onclick={() => ontab(t.id)}
			>
				{t.label}
			</button>
		{/each}
	</div>

	{#if active === 'preferences'}
		<PreferencesTab {prefs} />
	{:else}
		<AccountTab name={user.name} email={user.email} />
	{/if}
</Modal>
