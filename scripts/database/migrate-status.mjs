import { spawnSync } from "node:child_process";
import { ensureDatabaseUrl, listAppliedMigrations } from "./shared-config.mjs";

ensureDatabaseUrl();
console.log("Checking migration status via drizzle-kit check...");
const check = spawnSync("npx", ["drizzle-kit", "check"], {
	stdio: "inherit",
	env: process.env,
	shell: true,
});
try {
	const rows = await listAppliedMigrations();
	console.log(`Applied drizzle migrations: ${rows.length}`);
	for (const r of rows) {
		console.log(` - ${r.hash ?? r.id ?? JSON.stringify(r)}`);
	}
} catch (e) {
	console.error(
		"Could not list applied migrations (DB not reachable or no migrations table):",
		e.message,
	);
}
process.exit(check.status ?? 0);
