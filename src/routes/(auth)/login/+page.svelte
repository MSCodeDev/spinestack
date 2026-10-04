<script lang="ts">
	import { enhance } from '$app/forms';
	import AuthCard from '#lib/components/AuthCard.svelte';

	let { form } = $props();
</script>

<AuthCard title="Sign in">
	<form method="post" use:enhance class="space-y-4">
		<label class="block text-sm font-medium">
			Email
			<input
				name="email"
				type="email"
				required
				autocomplete="email"
				value={form?.email ?? ''}
				class="mt-1 w-full rounded-md"
			/>
		</label>
		<label class="block text-sm font-medium">
			Password
			<input
				name="password"
				type="password"
				required
				autocomplete="current-password"
				class="mt-1 w-full rounded-md"
			/>
		</label>
		{#if form?.error}<p class="text-sm text-destructive" role="alert">{form.error}</p>{/if}
		<button class="btn btn-primary w-full justify-center"> Sign in </button>
	</form>
</AuthCard>
