<script lang="ts">
	import { groupLabel } from '#lib/library/groups.js';
	import type { GroupField } from '#lib/library/query.js';

	let { field, label, count }: { field: GroupField; label: string | null; count: number } =
		$props();
</script>

<h2 class="flex items-baseline gap-2 border-b border-border pb-1 text-base font-semibold">
	{groupLabel(field, label)}
	<span class="text-sm font-normal text-muted-foreground">{count}</span>
</h2>
