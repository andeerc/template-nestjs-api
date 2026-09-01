import { spawnSync } from "node:child_process";
import { ensureDatabaseUrl } from "./shared-config.mjs";

ensureDatabaseUrl();
const extraArgs = process.argv.slice(2);
const result = spawnSync("npx", ["drizzle-kit", "generate", ...extraArgs], {
	stdio: "inherit",
	env: process.env,
	shell: true,
});
process.exit(result.status ?? 0);
