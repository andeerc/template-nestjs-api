import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["**/*.spec.ts"],
		testTimeout: 30000,
	},
	resolve: {
		alias: {
			"@": resolve(__dirname, "./"),
			src: resolve(__dirname, "./"),
		},
	},
});
