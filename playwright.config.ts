import { defineConfig } from '@playwright/test';

const port = 5174;

export default defineConfig({
	testDir: 'e2e',
	workers: 1,
	expect: { timeout: 10_000 },
	globalSetup: './e2e/global-setup.ts',
	use: {
		baseURL: `http://localhost:${port}`,
		permissions: ['camera'],
		launchOptions: {
			// Fake camera that plays a clip of an ISBN barcode (see e2e/global-setup.ts)
			args: [
				'--use-fake-device-for-media-stream',
				'--use-fake-ui-for-media-stream',
				'--use-file-for-fake-video-capture=e2e/.tmp/barcode.y4m'
			]
		}
	},
	webServer: {
		command: `rm -rf .e2e-data && npm run dev -- --port ${port} --strictPort`,
		url: `http://localhost:${port}`,
		reuseExistingServer: false,
		env: {
			DATA_DIR: './.e2e-data',
			ORIGIN: `http://localhost:${port}`,
			BETTER_AUTH_SECRET: 'e2e-only-secret-do-not-use-in-production-0123456789'
		}
	}
});
