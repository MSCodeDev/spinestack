<script lang="ts">
	import { enhance } from '$app/forms';
	import AuthCard from '#lib/components/AuthCard.svelte';

	let { form } = $props();
</script>

<svelte:head><title>Sign in · SpineStack</title></svelte:head>

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
				class="input"
			/>
		</label>
		<label class="block text-sm font-medium">
			Password
			<input
				name="password"
				type="password"
				required
				autocomplete="current-password"
				class="input"
			/>
		</label>
		{#if form?.error}<p class="text-sm text-destructive" role="alert">{form.error}</p>{/if}
		<button class="btn btn-primary w-full justify-center"> Sign in </button>
	</form>
</AuthCard>
