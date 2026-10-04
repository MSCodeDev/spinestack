<script lang="ts">
	import Modal from './Modal.svelte';
	import BookForm from './BookForm.svelte';
	import type { Options } from '#lib/types.js';

	type Props = {
		open: boolean;
		options: Options;
		onclose: () => void;
		onsaved: (bookId: string) => void | Promise<void>;
	};

	let { open, options, onclose, onsaved }: Props = $props();
</script>

<Modal {open} title="Add book" {onclose}>
	<BookForm id="add-book-form" {options} {onsaved} oncancel={onclose} />
</Modal>
