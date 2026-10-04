<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';

	type Props = Omit<HTMLInputAttributes, 'value'> & {
		value?: string;
		suggestions?: string[];
		/** Called when a suggestion is chosen from the list. */
		onpick?: (value: string) => void;
		class?: string;
		wrapperClass?: string;
	};

	let {
		value = $bindable(''),
		suggestions = [],
		onpick,
		onkeydown,
		onblur,
		class: className,
		wrapperClass,
		...rest
	}: Props = $props();

	const listId = $props.id();
	let open = $state(false);
	let active = $state(-1);

	const matches = $derived.by(() => {
		const q = value.trim().toLowerCase();
		return suggestions
			.filter((s) => s.toLowerCase() !== q && (!q || s.toLowerCase().includes(q)))
			.slice(0, 8);
	});

	function pick(next: string) {
		value = next;
		open = false;
		active = -1;
		onpick?.(next);
	}

	function handleKeydown(e: KeyboardEvent & { currentTarget: EventTarget & HTMLInputElement }) {
		if (matches.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
			e.preventDefault();
			open = true;
			const step = e.key === 'ArrowDown' ? 1 : -1;
			active = (active + step + matches.length) % matches.length;
			return;
		}
		if (open && active >= 0 && e.key === 'Enter') {
			e.preventDefault();
			pick(matches[active]);
			return;
		}
		if (open && e.key === 'Escape') {
			e.stopPropagation();
			open = false;
			return;
		}
		onkeydown?.(e);
	}
</script>

<div class={cn('relative', wrapperClass)}>
	<input
		bind:value
		role="combobox"
		aria-expanded={open && matches.length > 0}
		aria-controls={listId}
		aria-autocomplete="list"
		autocomplete="off"
		class={className}
		oninput={() => {
			open = true;
			active = -1;
		}}
		onfocus={() => (open = true)}
		onblur={(e) => {
			open = false;
			active = -1;
			onblur?.(e);
		}}
		onkeydown={handleKeydown}
		{...rest}
	/>
	{#if open && matches.length}
		<ul
			id={listId}
			role="listbox"
			class="absolute top-full left-0 z-50 mt-1.5 max-h-56 min-w-full overflow-auto rounded-2xl border border-border bg-popover p-1 text-sm shadow-lg"
		>
			{#each matches as m, i (m)}
				<!-- mousedown keeps focus in the input so the list does not close before the pick -->
				<li
					role="option"
					aria-selected={i === active}
					class="cursor-pointer rounded-xl px-3 py-2 whitespace-nowrap {i === active
						? 'bg-muted'
						: 'hover:bg-muted/70'}"
					onmousedown={(e) => {
						e.preventDefault();
						pick(m);
					}}
				>
					{m}
				</li>
			{/each}
		</ul>
	{/if}
</div>
