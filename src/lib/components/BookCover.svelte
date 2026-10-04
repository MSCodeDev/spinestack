<script lang="ts">
	import BlobShape from './BlobShape.svelte';
	import { hashString } from '#lib/blob.js';
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

	// No two corners match, and each book leans its own way, so a shelf never looks stamped out.
	const shapes = [
		'rounded-[0.5rem_1.5rem_1.2rem_0.7rem/0.8rem_1.2rem_1.7rem_0.5rem]',
		'rounded-[0.7rem_1.2rem_1.6rem_0.5rem/0.5rem_1.7rem_1.1rem_0.9rem]',
		'rounded-[0.4rem_1.7rem_1rem_0.8rem/0.9rem_1rem_1.5rem_0.4rem]',
		'rounded-[0.8rem_1.1rem_1.7rem_0.4rem/0.4rem_1.5rem_1.2rem_0.8rem]'
	];

	const seed = $derived(hashString(bookId || title));
	const shape = $derived(shapes[seed % shapes.length]);
	const colors = $derived(placeholderColors(title));
	// The handwriting font is wide, so long words need a smaller size to fit without breaking.
	const longest = $derived(Math.max(...title.split(/\s+/).map((w) => w.length)));
</script>

<!-- A book: an irregular outer edge, a shaded spine on the left, and a soft shadow. -->
<div
	class={cn(
		'relative aspect-[2/3] overflow-hidden shadow-md ring-1 ring-black/5',
		'before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:z-10 before:w-3 before:bg-gradient-to-r before:from-black/25 before:via-white/10 before:to-transparent',
		shape,
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
			class="relative flex h-full w-full flex-col items-center justify-between overflow-hidden p-4 pl-6 text-center"
			style="background: linear-gradient(160deg, {colors.bg}, {colors.bgDeep}); color: {colors.ink}"
		>
			<!-- soft shapes drifting in the background, different on every book -->
			<BlobShape
				{seed}
				class="pointer-events-none absolute -top-8 -right-10 size-40 opacity-[0.1]"
			/>
			<BlobShape
				seed={seed + 3}
				wobble={0.4}
				class="pointer-events-none absolute -bottom-10 -left-8 size-36 opacity-[0.09]"
			/>
			<span class="relative h-1 w-8 rounded-full bg-current opacity-30"></span>
			<span
				class="relative font-display leading-[0.95] font-bold text-balance break-words {longest > 11
					? 'text-xl'
					: longest > 8
						? 'text-2xl'
						: 'text-3xl'}">{title}</span
			>
			<span class="relative text-xs font-semibold tracking-wide uppercase opacity-70"
				>{author ?? ''}</span
			>
		</div>
	{/if}
</div>
