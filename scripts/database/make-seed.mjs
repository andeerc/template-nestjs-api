import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../src/shared/infrastructure/database/seeds",
);
const name = process.argv[2] || `seed_${Date.now()}`;
const fileName = name.endsWith(".ts") ? name : `${name}.ts`;
const filePath = path.join(dir, fileName);
if (fs.existsSync(filePath)) {
	console.error(`Seed file already exists: ${filePath}`);
	process.exit(1);
}
fs.writeFileSync(
	filePath,
	`import type { DrizzleDb } from '../database.types';\n\nexport async function run(db: DrizzleDb): Promise<void> {\n  // TODO: implement seed using drizzle insert\n  console.log('Running seed: ${fileName}');\n}\n\nexport async function revert(db: DrizzleDb): Promise<void> {\n  console.log('Reverting seed: ${fileName}');\n}\n`,
);
console.log(`Created seed file: ${filePath}`);
