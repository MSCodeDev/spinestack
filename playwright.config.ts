import { defineConfig } from '@playwright/test';

const port = 5174;

export default defineConfig({
	testDir: 'e2e',
	workers: 1,
	use: { baseURL: `http://localhost:${port}` },
	webServer: {
		command: `rm -rf .e2e-data && npm run dev -- --port ${port} --strictPort`,
		url: `http://localhost:${port}`,
		reuseExistingServer: false,
		env: { DATA_DIR: './.e2e-data', ORIGIN: `http://localhost:${port}` }
	}
});
