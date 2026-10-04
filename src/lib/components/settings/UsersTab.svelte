<script lang="ts">
	import { api } from '#lib/client/api.js';
	import { confirm } from '#lib/stores/confirm.svelte.js';
	import { toast } from '#lib/stores/toast.svelte.js';

	type Account = {
		id: string;
		name: string;
		email: string;
		role: 'admin' | 'user';
		createdAt: number;
	};

	let { currentUserEmail }: { currentUserEmail: string } = $props();

	let users = $state<Account[] | null>(null);
	let error = $state<string | null>(null);
	let resetting = $state<string | null>(null);
	let newPassword = $state('');

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let role = $state<'user' | 'admin'>('user');
	let formError = $state<string | null>(null);

	async function run(action: () => Promise<{ users: Account[] }>, success: string) {
		try {
			users = (await action()).users;
			toast(success);
			return true;
		} catch (e) {
			toast(e instanceof Error ? e.message : 'Something went wrong', 'error');
			return false;
		}
	}

	$effect(() => {
		api<{ users: Account[] }>('/api/settings/users')
			.then((r) => (users = r.users))
			.catch((e) => (error = e instanceof Error ? e.message : 'Could not load users.'));
	});

	async function create(e: SubmitEvent) {
		e.preventDefault();
		formError = null;
		try {
			users = (
				await api<{ users: Account[] }>('/api/settings/users', 'POST', {
					name,
					email,
					password,
					role
				})
			).users;
			name = email = password = '';
			role = 'user';
			toast('User created');
		} catch (err) {
			formError = err instanceof Error ? err.message : 'Could not create the user.';
		}
	}

	async function setRole(u: Account) {
		const next = u.role === 'admin' ? 'user' : 'admin';
		await run(
			() => api('/api/settings/users', 'PATCH', { id: u.id, role: next }),
			`${u.name} is now ${next === 'admin' ? 'an administrator' : 'a regular user'}`
		);
	}

	async function resetPassword(u: Account) {
		const ok = await run(
			() => api('/api/settings/users', 'PATCH', { id: u.id, password: newPassword }),
			'Password reset'
		);
		if (ok) resetting = null;
		newPassword = '';
	}

	async function remove(u: Account) {
		if (
			!(await confirm(
				`Delete ${u.name} (${u.email})? Their library and all its books will be deleted too.`
			))
		)
			return;
		await run(() => api(`/api/settings/users?id=${u.id}`, 'DELETE'), 'User deleted');
	}
</script>

<div class="space-y-6 text-sm">
	{#if error}
		<p class="text-destructive" role="alert">{error}</p>
	{:else if !users}
		<p class="text-muted-foreground">Loading…</p>
	{:else}
		<ul class="divide-y divide-dashed divide-border overflow-hidden soft-f border border-border">
			{#each users as u (u.id)}
				<li class="space-y-2 px-3 py-2">
					<div class="flex flex-wrap items-center gap-2">
						<div class="min-w-0 flex-1">
							<p class="truncate font-medium">
								{u.name}
								{#if u.email === currentUserEmail}<span
										class="text-xs font-normal text-muted-foreground">(you)</span
									>{/if}
							</p>
							<p class="truncate text-xs text-muted-foreground">{u.email}</p>
						</div>
						<span
							class="rounded-full px-2 py-0.5 text-xs {u.role === 'admin'
								? 'bg-secondary text-secondary-foreground  '
								: 'bg-muted '}">{u.role}</span
						>
						{#if u.email !== currentUserEmail}
							<button type="button" class="btn text-xs" onclick={() => setRole(u)}>
								{u.role === 'admin' ? 'Make user' : 'Make admin'}
							</button>
							<button
								type="button"
								class="btn text-xs"
								onclick={() => (resetting = resetting === u.id ? null : u.id)}
								>Reset password</button
							>
							<button
								type="button"
								class="btn text-xs text-destructive"
								aria-label="Delete {u.name}"
								onclick={() => remove(u)}>Delete</button
							>
						{/if}
					</div>
					{#if resetting === u.id}
						<form
							class="flex gap-2"
							onsubmit={(e) => {
								e.preventDefault();
								resetPassword(u);
							}}
						>
							<input
								class="input mt-0 flex-1"
								type="password"
								bind:value={newPassword}
								minlength="8"
								required
								placeholder="New password for {u.name}"
								aria-label="New password for {u.name}"
								autocomplete="new-password"
							/>
							<button class="btn btn-primary">Set</button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>

		<form class="space-y-3" onsubmit={create}>
			<h3 class="font-display text-2xl leading-none font-bold">Add a user</h3>
			<div class="grid gap-3 sm:grid-cols-2">
				<label class="block font-medium"
					>Name<input class="input" bind:value={name} required /></label
				>
				<label class="block font-medium"
					>Email<input
						class="input"
						type="email"
						bind:value={email}
						required
						autocomplete="off"
					/></label
				>
				<label class="block font-medium"
					>Password<input
						class="input"
						type="password"
						bind:value={password}
						required
						minlength="8"
						autocomplete="new-password"
					/></label
				>
				<label class="block font-medium">
					Role
					<select class="input" bind:value={role}>
						<option value="user">User</option>
						<option value="admin">Administrator</option>
					</select>
				</label>
			</div>
			{#if formError}<p class="text-destructive" role="alert">{formError}</p>{/if}
			<button class="btn btn-primary">Create user</button>
			<p class="text-xs text-muted-foreground">Each user gets their own separate library.</p>
		</form>
	{/if}
</div>
