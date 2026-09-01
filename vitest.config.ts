import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.spec.ts"],
		reporters: process.env.GITHUB_ACTIONS ? ["dot", "github-actions"] : ["dot"],
		testTimeout: 30000,
		projects: ["src"],
		coverage: {
			provider: "v8",
			reportsDirectory: "./coverage",
			include: ["src/**/*.{ts,js}"],
			exclude: ["**/*.spec.ts", "**/*.test.ts", "src/main.ts", "dist/**"],
		},
	},
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src"),
			src: resolve(__dirname, "./src"),
		},
	},
});
