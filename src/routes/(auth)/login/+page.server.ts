import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { hasUsers } from '$lib/server/users';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(303, '/');
	if (!(await hasUsers())) redirect(303, '/setup');
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');

		try {
			await auth.api.signInEmail({ body: { email, password } });
		} catch {
			return fail(400, { email, error: 'Invalid email or password.' });
		}
		redirect(303, '/');
	}
};
