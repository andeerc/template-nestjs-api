import { Pool } from "pg";
import { ensureDatabaseUrl } from "./shared-config.mjs";

ensureDatabaseUrl();
const pool = new Pool({ connectionString: ensureDatabaseUrl() });
try {
	const users = await pool
		.query("select count(*) as count from users")
		.catch(() => ({ rows: [{ count: "0" }] }));
	const orgs = await pool
		.query("select count(*) as count from organizations")
		.catch(() => ({ rows: [{ count: "0" }] }));
	console.log(
		`users: ${users.rows[0]?.count ?? 0}, organizations: ${orgs.rows[0]?.count ?? 0}`,
	);
} finally {
	await pool.end();
}
