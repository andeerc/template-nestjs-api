import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDatabaseUrl } from "./shared-config.mjs";

ensureDatabaseUrl();
const runnerTs = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../src/shared/infrastructure/database/seeds/run-seed.ts",
);
const result = spawnSync("npx", ["tsx", runnerTs], {
	stdio: "inherit",
	env: process.env,
	shell: true,
});
process.exit(result.status ?? 0);
