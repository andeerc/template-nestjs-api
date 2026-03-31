#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const HELP_TEXT = `Usage:
  npm run bootstrap
  npm run bootstrap -- --name "Acme API"
  npm run bootstrap -- --name "Acme API" --package-name acme-api --description "API da Acme"

Options:
  --name <value>          Application display name
  --package-name <value>  npm package name
  --description <value>   Application description
  --dry-run               Preview planned updates without writing files
  --yes                   Skip confirmation prompt
  --help, -h              Show this help message
`;

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    name: null,
    packageName: null,
    description: null,
    dryRun: false,
    yes: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--yes') {
      options.yes = true;
      continue;
    }

    if (arg === '--name' || arg === '--package-name' || arg === '--description') {
      const value = argv[index + 1];

      if (!value) {
        fail(`Missing value for ${arg}.`);
      }

      if (arg === '--name') {
        options.name = value;
      }

      if (arg === '--package-name') {
        options.packageName = value;
      }

      if (arg === '--description') {
        options.description = value;
      }

      index += 1;
      continue;
    }

    fail(`Unknown option: ${arg}`);
  }

  return options;
}

function splitWords(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(part => part.toLowerCase());
}

function toPackageSlug(value) {
  return splitWords(value).join('-');
}

function validatePackageName(value) {
  return /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(value);
}

function readText(relativePath) {
  const filePath = path.join(projectRoot, relativePath);
  return fs.readFileSync(filePath, 'utf8');
}

function readTextIfExists(relativePath) {
  const filePath = path.join(projectRoot, relativePath);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  return fs.readFileSync(filePath, 'utf8');
}

function writeText(relativePath, content, dryRun) {
  if (dryRun) {
    return;
  }

  const filePath = path.join(projectRoot, relativePath);
  fs.writeFileSync(filePath, content, 'utf8');
}

function ensureTrailingNewline(value) {
  return value.endsWith('\n') ? value : `${value}\n`;
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function getEnvValue(content, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp(`^${escapedKey}=(.*)$`, 'm'));

  return match?.[1]?.trim() || null;
}

function replaceHeading(content, heading) {
  if (!content.startsWith('# ')) {
    return content;
  }

  const newlineIndex = content.indexOf('\n');

  if (newlineIndex === -1) {
    return `# ${heading}\n`;
  }

  return `# ${heading}${content.slice(newlineIndex)}`;
}

function replaceQuickStartHeading(content, appName) {
  const lines = content.split('\n');

  if (!lines[0]?.startsWith('# ')) {
    return content;
  }

  lines[0] = `# Quick Start - ${appName}`;
  return lines.join('\n');
}

function setEnvValue(content, key, value) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const line = `${key}=${value}`;
  const regex = new RegExp(`^${escapedKey}=.*$`, 'm');

  if (regex.test(content)) {
    return content.replace(regex, line);
  }

  return ensureTrailingNewline(content).concat(`${line}\n`);
}

function collectSummary(options) {
  const packageJson = readJson('package.json');
  const packageLock = readTextIfExists('package-lock.json');
  const envExample = readTextIfExists('.env.example');
  const envFile = readTextIfExists('.env');
  const readme = readTextIfExists('README.md');
  const quickStart = readTextIfExists('QUICK_START.md');

  const appName = options.name?.trim() || packageJson.name;
  const packageName = options.packageName?.trim() || toPackageSlug(appName);
  const description =
    options.description?.trim() ||
    packageJson.description ||
    `${appName} API`;

  if (!appName) {
    fail('Application name cannot be empty.');
  }

  if (!packageName) {
    fail('Package name cannot be empty.');
  }

  if (!validatePackageName(packageName)) {
    fail('Invalid npm package name. Use lowercase letters, numbers, dashes, dots or a valid scope.');
  }

  const updates = [
    {
      path: 'package.json',
      content: `${JSON.stringify(
        {
          ...packageJson,
          name: packageName,
          description,
        },
        null,
        2,
      )}\n`,
    },
  ];

  if (packageLock) {
    const parsedLock = JSON.parse(packageLock);

    parsedLock.name = packageName;

    if (parsedLock.packages?.['']) {
      parsedLock.packages[''].name = packageName;
    }

    updates.push({
      path: 'package-lock.json',
      content: `${JSON.stringify(parsedLock, null, 2)}\n`,
    });
  }

  if (envExample) {
    let nextEnvExample = envExample;
    nextEnvExample = setEnvValue(nextEnvExample, 'APP_NAME', appName);
    nextEnvExample = setEnvValue(nextEnvExample, 'APP_DESCRIPTION', description);

    updates.push({
      path: '.env.example',
      content: ensureTrailingNewline(nextEnvExample),
    });
  }

  if (envFile) {
    let nextEnvFile = envFile;
    nextEnvFile = setEnvValue(nextEnvFile, 'APP_NAME', appName);
    nextEnvFile = setEnvValue(nextEnvFile, 'APP_DESCRIPTION', description);

    updates.push({
      path: '.env',
      content: ensureTrailingNewline(nextEnvFile),
    });
  }

  if (readme) {
    updates.push({
      path: 'README.md',
      content: ensureTrailingNewline(replaceHeading(readme, appName)),
    });
  }

  if (quickStart) {
    updates.push({
      path: 'QUICK_START.md',
      content: ensureTrailingNewline(replaceQuickStartHeading(quickStart, appName)),
    });
  }

  return {
    appName,
    packageName,
    description,
    updates,
  };
}

async function promptForMissingValues(options) {
  if (options.name && options.packageName && options.description) {
    return options;
  }

  const packageJson = readJson('package.json');
  const envFile = readTextIfExists('.env');
  const envExample = readTextIfExists('.env.example');
  const configuredName =
    getEnvValue(envFile || '', 'APP_NAME') ||
    getEnvValue(envExample || '', 'APP_NAME');
  const configuredDescription =
    getEnvValue(envFile || '', 'APP_DESCRIPTION') ||
    getEnvValue(envExample || '', 'APP_DESCRIPTION');
  const defaultName = options.name || configuredName || packageJson.name || 'my-api';
  const defaultPackageName = options.packageName || toPackageSlug(defaultName);
  const defaultDescription =
    options.description ||
    configuredDescription ||
    packageJson.description ||
    'NestJS API';

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    if (!options.name) {
      const answer = await rl.question(`Project name (${defaultName}): `);
      options.name = answer.trim() || defaultName;
    }

    if (!options.packageName) {
      const answer = await rl.question(
        `Package name (${defaultPackageName}): `,
      );
      options.packageName = answer.trim() || defaultPackageName;
    }

    if (!options.description) {
      const answer = await rl.question(
        `Description (${defaultDescription}): `,
      );
      options.description = answer.trim() || defaultDescription;
    }
  } finally {
    rl.close();
  }

  return options;
}

async function confirmExecution(summary, options) {
  if (options.yes) {
    return true;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question(
      `Apply bootstrap for "${summary.appName}" (${summary.packageName})? [Y/n] `,
    );
    const normalized = answer.trim().toLowerCase();
    return normalized === '' || normalized === 'y' || normalized === 'yes';
  } finally {
    rl.close();
  }
}

function applyUpdates(summary, dryRun) {
  const changedFiles = [];

  for (const update of summary.updates) {
    const currentContent = readTextIfExists(update.path);

    if (currentContent === null || currentContent === update.content) {
      continue;
    }

    writeText(update.path, update.content, dryRun);
    changedFiles.push(update.path);
  }

  return changedFiles;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(HELP_TEXT);
    return;
  }

  await promptForMissingValues(options);

  const summary = collectSummary(options);
  const shouldApply = await confirmExecution(summary, options);

  if (!shouldApply) {
    console.log('Bootstrap cancelled.');
    return;
  }

  const changedFiles = applyUpdates(summary, options.dryRun);

  console.log('');
  console.log(options.dryRun ? 'Planned changes:' : 'Bootstrap complete:');

  if (changedFiles.length === 0) {
    console.log('- No file changes were necessary.');
    return;
  }

  for (const changedFile of changedFiles) {
    console.log(`- ${changedFile}`);
  }
}

void main();
