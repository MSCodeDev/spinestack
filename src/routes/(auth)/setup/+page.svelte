<script lang="ts">
	import { enhance } from '$app/forms';
	import AuthCard from '#lib/components/AuthCard.svelte';

	let { form } = $props();
</script>

<AuthCard title="Welcome!" subtitle="Create the administrator account to get started.">
	<form method="post" use:enhance class="space-y-4">
		<label class="block text-sm font-medium">
			Name
			<input name="name" required autocomplete="name" value={form?.name ?? ''} class="input" />
		</label>
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
				minlength="8"
				autocomplete="new-password"
				class="input"
			/>
		</label>
		{#if form?.error}<p class="text-sm text-destructive" role="alert">{form.error}</p>{/if}
		<button class="btn btn-primary w-full justify-center"> Create account </button>
	</form>
</AuthCard>
