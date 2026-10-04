<script lang="ts">
	import { placeholderColors } from '#lib/library/placeholder.js';
	import { cn } from '#lib/utils.js';

	type Props = {
		bookId: string;
		title: string;
		author?: string | null;
		coverVersion: number;
		size?: '256' | '512';
		class?: string;
		lazy?: boolean;
	};

	let {
		bookId,
		title,
		author = null,
		coverVersion,
		size = '256',
		class: className,
		lazy = true
	}: Props = $props();

	const colors = $derived(placeholderColors(title));
	// The handwriting font is wide, so long words need a smaller size to fit without breaking.
	const longest = $derived(Math.max(...title.split(/\s+/).map((w) => w.length)));
</script>

<!-- A book: rounded outer edge, a shaded spine on the left, and a soft shadow. -->
<div
	class={cn(
		'relative aspect-[2/3] overflow-hidden rounded-l-md rounded-r-2xl shadow-md ring-1 ring-black/5',
		'before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:z-10 before:w-3 before:bg-gradient-to-r before:from-black/25 before:via-white/10 before:to-transparent',
		className
	)}
>
	{#if coverVersion > 0}
		<img
			src="/covers/{bookId}/{size}?v={coverVersion}"
			alt="Cover of {title}"
			loading={lazy ? 'lazy' : 'eager'}
			class="h-full w-full object-cover"
		/>
	{:else}
		<div
			class="flex h-full w-full flex-col items-center justify-between p-4 pl-6 text-center"
			style="background: linear-gradient(160deg, {colors.bg}, {colors.bgDeep}); color: {colors.ink}"
		>
			<span class="h-px w-8 bg-current opacity-40"></span>
			<span
				class="font-display leading-[0.95] font-bold text-balance break-words {longest > 11
					? 'text-xl'
					: longest > 8
						? 'text-2xl'
						: 'text-3xl'}">{title}</span
			>
			<span class="text-xs font-semibold tracking-wide uppercase opacity-70">{author ?? ''}</span>
		</div>
	{/if}
</div>
