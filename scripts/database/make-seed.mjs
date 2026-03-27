import fs from 'node:fs';
import path from 'node:path';
import { seedsDirectory } from './shared-config.mjs';

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

const rawName = process.argv[2] || process.env.npm_config_name;

if (!rawName) {
  fail('Provide a seed name. Example: npm run seed:make -- bootstrap_admin_user');
}

const normalizedName = rawName
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

if (!normalizedName) {
  fail('Seed name could not be normalized.');
}

const timestamp = new Date()
  .toISOString()
  .replace(/[-:TZ.]/g, '')
  .slice(0, 14);

const fileName = `${timestamp}_${normalizedName}.mjs`;
const filePath = path.join(seedsDirectory, fileName);

if (fs.existsSync(filePath)) {
  fail(`Seed "${fileName}" already exists.`);
}

const template = `export async function seed(knex) {
  return null;
}

export async function down(knex, meta) {
}
`;

fs.mkdirSync(seedsDirectory, { recursive: true });
fs.writeFileSync(filePath, template, 'utf8');

console.log(`Created seed: ${fileName}`);
