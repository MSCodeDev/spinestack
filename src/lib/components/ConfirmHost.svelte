<script lang="ts">
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js';
	import { confirmState } from '#lib/stores/confirm.svelte.js';

	function answer(ok: boolean) {
		confirmState.current?.resolve(ok);
		confirmState.current = null;
	}
</script>

<AlertDialog.Root
	open={confirmState.current !== null}
	onOpenChange={(open) => !open && confirmState.current && answer(false)}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title class="font-display text-3xl leading-none font-bold"
				>Are you sure?</AlertDialog.Title
			>
			<AlertDialog.Description>{confirmState.current?.message}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action variant="destructive" onclick={() => answer(true)}>
				{confirmState.current?.confirmLabel}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
