<script lang="ts">
	import { groupLabel } from '#lib/library/groups.js';
	import type { GroupField } from '#lib/library/query.js';

	let { field, label, count }: { field: GroupField; label: string | null; count: number } =
		$props();
</script>

<h2 class="flex items-baseline gap-3">
	<span class="font-display text-3xl leading-none font-bold">{groupLabel(field, label)}</span>
	<span class="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground"
		>{count}</span
	>
	<span class="squiggle flex-1 self-center"></span>
</h2>
