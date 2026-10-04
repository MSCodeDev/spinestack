<script lang="ts">
	import CoverCard from './CoverCard.svelte';
	import GroupHeading from './GroupHeading.svelte';
	import type { Segment } from '#lib/library/groups.js';
	import type { GroupField } from '#lib/library/query.js';

	let { segments, group }: { segments: Segment[]; group: GroupField } = $props();
</script>

<div class="space-y-8">
	{#each segments as segment (segment.label ?? '\u0000none')}
		<section class="space-y-3">
			{#if group !== 'none'}<GroupHeading
					field={group}
					label={segment.label}
					count={segment.count}
				/>{/if}
			<ul
				class="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8"
			>
				{#each segment.items as book (book.id)}
					<li><CoverCard {book} /></li>
				{/each}
			</ul>
		</section>
	{/each}
</div>
