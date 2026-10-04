import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { hasUsers } from '$lib/server/users';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	if (await hasUsers()) redirect(303, '/login');
};

export const actions: Actions = {
	default: async ({ request }) => {
		if (await hasUsers()) redirect(303, '/login');

		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');

		if (!name || !email) return fail(400, { name, email, error: 'Name and email are required.' });
		if (password.length < 8) {
			return fail(400, { name, email, error: 'Password must be at least 8 characters.' });
		}

		try {
			await auth.api.createUser({ body: { name, email, password, role: 'admin' } });
			await auth.api.signInEmail({ body: { email, password } });
		} catch {
			return fail(400, { name, email, error: 'Could not create the account.' });
		}
		redirect(303, '/');
	}
};
