<script lang="ts">
	import { Check } from '@lucide/svelte';
	import { refreshAll } from '$app/navigation';
	import { api } from '#lib/client/api.js';
	import { ACCENTS, THEMES, type Preferences } from '#lib/preferences.js';
	import { VIEWS } from '#lib/library/query.js';
	import { toast } from '#lib/stores/toast.svelte.js';
	import { applyAccent, applyTheme } from '#lib/theme.js';

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
			if (patch.accent) applyAccent(next.accent);
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

	<div role="radiogroup" aria-label="Theme colour" class="space-y-2 font-medium">
		<span class="block">Theme colour</span>
		<div class="flex flex-wrap gap-3">
			{#each ACCENTS as a (a)}
				<!-- each swatch sets its own data-accent, so bg-primary shows that colour -->
				<button
					type="button"
					role="radio"
					aria-checked={prefs.accent === a}
					aria-label={a[0].toUpperCase() + a.slice(1)}
					title={a[0].toUpperCase() + a.slice(1)}
					data-accent={a}
					class="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm ring-offset-2 ring-offset-card transition hover:scale-110 {prefs.accent ===
					a
						? 'ring-2 ring-foreground'
						: ''}"
					onclick={() => save({ accent: a })}
				>
					{#if prefs.accent === a}<Check size={18} strokeWidth={3} />{/if}
				</button>
			{/each}
		</div>
	</div>

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
