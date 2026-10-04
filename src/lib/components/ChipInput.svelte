<script lang="ts">
	type Props = {
		/** When set, each value is also submitted as a hidden form field. */
		name?: string;
		values?: string[];
		suggestions?: string[];
		placeholder?: string;
		onchange?: (values: string[]) => void;
	};

	let {
		name,
		values = $bindable([]),
		suggestions = [],
		placeholder = '',
		onchange
	}: Props = $props();

	const listId = $props.id();
	let draft = $state('');

	function set(next: string[]) {
		values = next;
		onchange?.(next);
	}

	function commit() {
		const value = draft.trim().replace(/,+$/, '');
		draft = '';
		if (value && !values.some((v) => v.toLowerCase() === value.toLowerCase())) {
			set([...values, value]);
		}
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			commit();
		} else if (e.key === 'Backspace' && !draft && values.length) {
			set(values.slice(0, -1));
		}
	}
</script>

<div
	class="mt-1 flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-card p-1.5 focus-within:ring-2 focus-within:ring-ring/50"
>
	{#each values as value, i (value)}
		<span class="flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-sm">
			{value}
			<button
				type="button"
				onclick={() => set(values.filter((_, j) => j !== i))}
				aria-label="Remove {value}"
				class="text-muted-foreground hover:text-foreground dark:hover:text-white">×</button
			>
			{#if name}<input type="hidden" {name} {value} />{/if}
		</span>
	{/each}
	<input
		bind:value={draft}
		{onkeydown}
		onblur={commit}
		list={listId}
		{placeholder}
		class="min-w-24 flex-1 border-0 bg-transparent p-0.5 text-sm focus:ring-0"
	/>
	<datalist id={listId}>
		{#each suggestions as s (s)}<option value={s}></option>{/each}
	</datalist>
</div>
