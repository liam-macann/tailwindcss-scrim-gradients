import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		projects: [
			{
				extends: true,
				test: { name: 'tailwind-v4', env: { TAILWIND_VERSION: '4' } },
			},
			{
				extends: true,
				test: { name: 'tailwind-v3', env: { TAILWIND_VERSION: '3' } },
				// Build the plugin with v3 plugin()
				resolve: {
					alias: [{ find: /^tailwindcss\/plugin$/, replacement: 'tailwindcss-v3/plugin' }],
				},
			},
		],
	},
});
