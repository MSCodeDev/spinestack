<script lang="ts">
	import { X } from '@lucide/svelte';
	import SuggestInput from './SuggestInput.svelte';

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

	let draft = $state('');

	function set(next: string[]) {
		values = next;
		onchange?.(next);
	}

	function add(raw: string) {
		const value = raw.trim().replace(/,+$/, '');
		draft = '';
		if (value && !values.some((v) => v.toLowerCase() === value.toLowerCase())) {
			set([...values, value]);
		}
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			add(draft);
		} else if (e.key === 'Backspace' && !draft && values.length) {
			set(values.slice(0, -1));
		}
	}
</script>

<div
	class="mt-1 flex min-h-10 flex-wrap items-center gap-1.5 rounded-3xl border border-input bg-card px-2.5 py-1.5 shadow-xs transition focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/40"
>
	{#each values as value, i (value)}
		<span
			class="flex items-center gap-1 rounded-full bg-secondary py-0.5 pr-1 pl-3 text-sm font-semibold text-secondary-foreground"
		>
			{value}
			<button
				type="button"
				onclick={() => set(values.filter((_, j) => j !== i))}
				aria-label="Remove {value}"
				class="grid size-5 place-items-center rounded-full hover:bg-foreground/10"
			>
				<X size={12} />
			</button>
			{#if name}<input type="hidden" {name} {value} />{/if}
		</span>
	{/each}
	<SuggestInput
		bind:value={draft}
		{suggestions}
		{placeholder}
		{onkeydown}
		onblur={() => add(draft)}
		onpick={add}
		wrapperClass="min-w-28 flex-1"
		class="w-full border-0 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground"
	/>
</div>
