<script lang="ts" generics="T extends string">
	import * as Tabs from '#lib/components/ui/tabs/index.js';

	type Props = {
		tabs: { id: T; label: string }[];
		value: T;
		onchange: (value: T) => void;
	};

	let { tabs, value, onchange }: Props = $props();
</script>

<!-- Only the tab strip: the caller shows the matching content. -->
<Tabs.Root {value} onValueChange={(v) => onchange(v as T)} class="mb-5">
	<Tabs.List class="h-11 w-full rounded-full bg-primary/12 p-1 dark:bg-primary/20">
		{#each tabs as t (t.id)}
			<Tabs.Trigger
				value={t.id}
				class="h-full rounded-full text-sm font-bold text-muted-foreground transition hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground"
			>
				{t.label}
			</Tabs.Trigger>
		{/each}
	</Tabs.List>
</Tabs.Root>
