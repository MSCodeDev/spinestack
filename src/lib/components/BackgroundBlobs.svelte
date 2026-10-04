<script lang="ts">
	import BlobShape from './BlobShape.svelte';
</script>

<!-- Big soft shapes drifting behind the page. They sit under the content and ignore the pointer. -->
<div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
	<BlobShape
		seed={11}
		class="animate-drift absolute -top-40 -left-32 size-[34rem] text-tile-coral opacity-55"
	/>
	<BlobShape
		seed={29}
		class="animate-drift absolute top-1/3 -right-48 size-[40rem] text-tile-teal opacity-50 [animation-delay:-9s]"
	/>
	<BlobShape
		seed={53}
		class="animate-drift absolute -bottom-52 left-1/4 size-[38rem] text-tile-butter opacity-50 [animation-delay:-17s]"
	/>
</div>
