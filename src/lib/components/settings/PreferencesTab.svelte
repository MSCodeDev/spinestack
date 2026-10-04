<script lang="ts">
	import { refreshAll } from '$app/navigation';
	import { api } from '#lib/client/api.js';
	import { PAGE_SIZES, THEMES, type Preferences } from '#lib/preferences.js';
	import { VIEWS } from '#lib/library/query.js';
	import { toast } from '#lib/stores/toast.svelte.js';
	import { applyTheme } from '#lib/theme.js';

	let { prefs }: { prefs: Preferences } = $props();

	const currencies = [
		'USD',
		'EUR',
		'GBP',
		'CAD',
		'AUD',
		'NZD',
		'JPY',
		'CHF',
		'SEK',
		'NOK',
		'DKK',
		'ZAR',
		'INR',
		'BRL',
		'MXN'
	];

	async function save(patch: Partial<Preferences>) {
		try {
			const next = await api<Preferences>('/api/settings/preferences', 'PUT', patch);
			if (patch.theme) applyTheme(next.theme);
			await refreshAll();
			toast('Preferences saved');
		} catch (e) {
			toast(e instanceof Error ? e.message : 'Could not save', 'error');
		}
	}
</script>

<div class="space-y-5 text-sm">
	<label class="block font-medium">
		Theme
		<select
			class="input"
			value={prefs.theme}
			onchange={(e) => save({ theme: e.currentTarget.value as Preferences['theme'] })}
		>
			{#each THEMES as t (t)}<option value={t}>{t[0].toUpperCase() + t.slice(1)}</option>{/each}
		</select>
	</label>

	<label class="block font-medium">
		Default view
		<select
			class="input"
			value={prefs.defaultView}
			onchange={(e) => save({ defaultView: e.currentTarget.value as Preferences['defaultView'] })}
		>
			{#each VIEWS as v (v)}<option value={v}>{v[0].toUpperCase() + v.slice(1)}</option>{/each}
		</select>
	</label>

	<label class="block font-medium">
		Books per page
		<select
			class="input"
			value={prefs.pageSize}
			onchange={(e) => save({ pageSize: Number(e.currentTarget.value) as Preferences['pageSize'] })}
		>
			{#each PAGE_SIZES as n (n)}<option value={n}>{n}</option>{/each}
		</select>
	</label>

	<label class="block font-medium">
		Currency for new books
		<input
			class="input uppercase"
			list="currencies"
			maxlength="3"
			value={prefs.currency}
			onchange={(e) => save({ currency: e.currentTarget.value })}
		/>
		<datalist id="currencies">
			{#each currencies as c (c)}<option value={c}></option>{/each}
		</datalist>
	</label>
</div>
