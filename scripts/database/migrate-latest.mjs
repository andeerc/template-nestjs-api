import { spawnSync } from "node:child_process";
import { ensureDatabaseUrl } from "./shared-config.mjs";

ensureDatabaseUrl();
const result = spawnSync("npx", ["drizzle-kit", "migrate"], {
	stdio: "inherit",
	env: process.env,
	shell: true,
});
process.exit(result.status ?? 0);
