#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const HELP_TEXT = `Usage:
  pnpm bootstrap
  pnpm bootstrap -- --name "Acme API"
  pnpm bootstrap -- --name "Acme API" --package-name acme-api --google-auth true --google-client-id your-client-id

Options:
  --name <value>                   Application display name
  --package-name <value>           npm package name
  --description <value>            Application description
  --email-enabled <true|false>     Enable email delivery with SMTP
  --google-auth <true|false>       Enable Google authentication
  --google-client-id <value>       Google OAuth client ID used to validate id_token
  --google-client-secret <value>   Google OAuth client secret
  --better-auth-secret <value>     Better Auth secret (min 32 chars)
  --better-auth-url <value>        Better Auth base URL
  --seed-admin-email <value>       Seed admin email
  --seed-admin-name <value>        Seed admin display name
  --seed-admin-password <value>    Seed admin password
  --seed-organization-name <value> Seed initial organization name
  --dry-run                        Preview planned updates without writing files
  --yes                            Skip confirmation prompt
  --help, -h                       Show this help message
`;

const projectRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

function fail(message) {
	console.error(`Error: ${message}`);
	process.exit(1);
}

function parseBooleanToken(value, optionName) {
	const normalized = value.trim().toLowerCase();

	if (["true", "1", "yes", "y"].includes(normalized)) {
		return true;
	}

	if (["false", "0", "no", "n"].includes(normalized)) {
		return false;
	}

	fail(`Invalid boolean for ${optionName}: ${value}`);
}

function parseArgs(argv) {
	const options = {
		name: null,
		packageName: null,
		description: null,
		emailEnabled: null,
		googleAuthEnabled: null,
		googleClientId: null,
		googleClientSecret: null,
		betterAuthSecret: null,
		betterAuthUrl: null,
		seedAdminEmail: null,
		seedAdminName: null,
		seedAdminPassword: null,
		seedOrganizationName: null,
		dryRun: false,
		yes: false,
		help: false,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];

		if (arg === "--help" || arg === "-h") {
			options.help = true;
			continue;
		}

		if (arg === "--dry-run") {
			options.dryRun = true;
			continue;
		}

		if (arg === "--yes") {
			options.yes = true;
			continue;
		}

		if (
			arg === "--name" ||
			arg === "--package-name" ||
			arg === "--description" ||
			arg === "--google-client-id" ||
			arg === "--google-client-secret" ||
			arg === "--better-auth-secret" ||
			arg === "--better-auth-url" ||
			arg === "--seed-admin-email" ||
			arg === "--seed-admin-name" ||
			arg === "--seed-admin-password" ||
			arg === "--seed-organization-name"
		) {
			const value = argv[index + 1];

			if (value === undefined) {
				fail(`Missing value for ${arg}.`);
			}

			if (arg === "--name") {
				options.name = value;
			} else if (arg === "--package-name") {
				options.packageName = value;
			} else if (arg === "--description") {
				options.description = value;
			} else if (arg === "--google-client-id") {
				options.googleClientId = value;
			} else if (arg === "--google-client-secret") {
				options.googleClientSecret = value;
			} else if (arg === "--better-auth-secret") {
				options.betterAuthSecret = value;
			} else if (arg === "--better-auth-url") {
				options.betterAuthUrl = value;
			} else if (arg === "--seed-admin-email") {
				options.seedAdminEmail = value;
			} else if (arg === "--seed-admin-name") {
				options.seedAdminName = value;
			} else if (arg === "--seed-admin-password") {
				options.seedAdminPassword = value;
			} else if (arg === "--seed-organization-name") {
				options.seedOrganizationName = value;
			}

			index += 1;
			continue;
		}

		if (arg === "--email-enabled" || arg === "--google-auth") {
			const value = argv[index + 1];

			if (value === undefined) {
				fail(`Missing value for ${arg}.`);
			}

			if (arg === "--email-enabled") {
				options.emailEnabled = parseBooleanToken(value, arg);
			} else {
				options.googleAuthEnabled = parseBooleanToken(value, arg);
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
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.split(/[^a-zA-Z0-9]+/)
		.filter(Boolean)
		.map((part) => part.toLowerCase());
}

function toPackageSlug(value) {
	return splitWords(value).join("-");
}

function toAppSlugFromPackageName(value) {
	const withoutScope = value.startsWith("@")
		? value.split("/")[1] || value.replace(/^@/, "")
		: value;

	return toPackageSlug(withoutScope);
}

function validatePackageName(value) {
	return /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(value);
}

function readText(relativePath) {
	const filePath = path.join(projectRoot, relativePath);
	return fs.readFileSync(filePath, "utf8");
}

function readTextIfExists(relativePath) {
	const filePath = path.join(projectRoot, relativePath);

	if (!fs.existsSync(filePath)) {
		return null;
	}

	return fs.readFileSync(filePath, "utf8");
}

function writeText(relativePath, content, dryRun) {
	if (dryRun) {
		return;
	}

	const filePath = path.join(projectRoot, relativePath);
	fs.writeFileSync(filePath, content, "utf8");
}

function ensureTrailingNewline(value) {
	return value.endsWith("\n") ? value : `${value}\n`;
}

function readJson(relativePath) {
	return JSON.parse(readText(relativePath));
}

function getEnvValue(content, key) {
	const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = content.match(new RegExp(`^${escapedKey}=(.*)$`, "m"));

	return match?.[1]?.trim() || null;
}

function setEnvValue(content, key, value) {
	const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const line = `${key}=${value ?? ""}`;
	const regex = new RegExp(`^${escapedKey}=.*$`, "m");

	if (regex.test(content)) {
		return content.replace(regex, line);
	}

	return ensureTrailingNewline(content).concat(`${line}\n`);
}

function replaceHeading(content, heading) {
	if (!content.startsWith("# ")) {
		return content;
	}

	const newlineIndex = content.indexOf("\n");

	if (newlineIndex === -1) {
		return `# ${heading}\n`;
	}

	return `# ${heading}${content.slice(newlineIndex)}`;
}

function replaceQuickStartHeading(content, appName) {
	const lines = content.split("\n");

	if (!lines[0]?.startsWith("# ")) {
		return content;
	}

	lines[0] = `# 🚀 Quick Start - ${appName}`;
	return lines.join("\n");
}

function resolveConfiguredValue(envFile, envExample, key, fallback = "") {
	return (
		getEnvValue(envFile || "", key) ||
		getEnvValue(envExample || "", key) ||
		fallback
	);
}

async function promptText(
	rl,
	label,
	defaultValue,
	{ allowEmpty = false } = {},
) {
	while (true) {
		const suffix = defaultValue ? ` (${defaultValue})` : "";
		const answer = await rl.question(`${label}${suffix}: `);
		const normalized = answer.trim();

		if (normalized) {
			return normalized;
		}

		if (defaultValue !== undefined && defaultValue !== null) {
			return defaultValue;
		}

		if (allowEmpty) {
			return "";
		}
	}
}

async function promptBoolean(rl, label, defaultValue) {
	while (true) {
		const answer = await rl.question(
			`${label} ${defaultValue ? "[Y/n]" : "[y/N]"} `,
		);
		const normalized = answer.trim().toLowerCase();

		if (normalized === "") {
			return defaultValue;
		}

		if (["y", "yes"].includes(normalized)) {
			return true;
		}

		if (["n", "no"].includes(normalized)) {
			return false;
		}
	}
}

async function promptForMissingValues(options) {
	const packageJson = readJson("package.json");
	const envFile = readTextIfExists(".env");
	const envExample = readTextIfExists(".env.example");

	const defaultName =
		options.name ||
		resolveConfiguredValue(
			envFile,
			envExample,
			"APP_NAME",
			packageJson.name || "my-api",
		);
	const defaultPackageName =
		options.packageName || packageJson.name || toPackageSlug(defaultName);
	const defaultDescription =
		options.description ||
		resolveConfiguredValue(
			envFile,
			envExample,
			"APP_DESCRIPTION",
			packageJson.description || "NestJS API",
		);
	const defaultEmailEnabled =
		options.emailEnabled ??
		resolveConfiguredValue(envFile, envExample, "EMAIL_ENABLED", "true") !==
			"false";
	const defaultGoogleAuthEnabled =
		options.googleAuthEnabled ??
		resolveConfiguredValue(
			envFile,
			envExample,
			"GOOGLE_AUTH_ENABLED",
			"false",
		) === "true";
	const defaultGoogleClientId =
		options.googleClientId ??
		resolveConfiguredValue(envFile, envExample, "GOOGLE_CLIENT_ID", "");
	const defaultGoogleClientSecret =
		options.googleClientSecret ??
		resolveConfiguredValue(envFile, envExample, "GOOGLE_CLIENT_SECRET", "");
	const defaultBetterAuthSecret =
		options.betterAuthSecret ??
		resolveConfiguredValue(
			envFile,
			envExample,
			"BETTER_AUTH_SECRET",
			"change-me-min-32-chars-long-secret-1234567890",
		);
	const defaultBetterAuthUrl =
		options.betterAuthUrl ??
		resolveConfiguredValue(
			envFile,
			envExample,
			"BETTER_AUTH_URL",
			resolveConfiguredValue(
				envFile,
				envExample,
				"API_URL",
				"http://localhost:3000",
			),
		);
	const defaultSeedAdminEmail =
		options.seedAdminEmail ??
		resolveConfiguredValue(
			envFile,
			envExample,
			"SEED_ADMIN_EMAIL",
			"admin@example.com",
		);
	const defaultSeedAdminName =
		options.seedAdminName ??
		resolveConfiguredValue(
			envFile,
			envExample,
			"SEED_ADMIN_NAME",
			"Administrador",
		);
	const defaultSeedAdminPassword =
		options.seedAdminPassword ??
		resolveConfiguredValue(
			envFile,
			envExample,
			"SEED_ADMIN_PASSWORD",
			"admin123456",
		);
	const defaultSeedOrganizationName =
		options.seedOrganizationName ??
		resolveConfiguredValue(envFile, envExample, "SEED_ORGANIZATION_NAME", "");

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	try {
		if (!options.name) {
			options.name = await promptText(rl, "Project name", defaultName);
		}

		if (!options.packageName) {
			options.packageName = await promptText(
				rl,
				"Package name",
				defaultPackageName,
			);
		}

		if (!options.description) {
			options.description = await promptText(
				rl,
				"Description",
				defaultDescription,
			);
		}

		if (options.emailEnabled === null) {
			options.emailEnabled = await promptBoolean(
				rl,
				"Enable email delivery with SMTP?",
				defaultEmailEnabled,
			);
		}

		if (options.googleAuthEnabled === null) {
			options.googleAuthEnabled = await promptBoolean(
				rl,
				"Enable Google Auth?",
				defaultGoogleAuthEnabled,
			);
		}

		if (options.googleAuthEnabled) {
			options.googleClientId = await promptText(
				rl,
				"Google Client ID",
				defaultGoogleClientId,
			);
			options.googleClientSecret = await promptText(
				rl,
				"Google Client Secret",
				defaultGoogleClientSecret,
				{ allowEmpty: true },
			);
		} else {
			options.googleClientId = "";
			options.googleClientSecret = "";
		}

		if (!options.betterAuthSecret) {
			options.betterAuthSecret = await promptText(
				rl,
				"Better Auth Secret (min 32 chars)",
				defaultBetterAuthSecret,
			);
		}
		if (!options.betterAuthUrl) {
			options.betterAuthUrl = await promptText(
				rl,
				"Better Auth URL",
				defaultBetterAuthUrl,
			);
		}

		if (!options.seedAdminEmail) {
			options.seedAdminEmail = await promptText(
				rl,
				"Seed admin email",
				defaultSeedAdminEmail,
			);
		}

		if (!options.seedAdminName) {
			options.seedAdminName = await promptText(
				rl,
				"Seed admin name",
				defaultSeedAdminName,
			);
		}

		if (!options.seedAdminPassword) {
			options.seedAdminPassword = await promptText(
				rl,
				"Seed admin password",
				defaultSeedAdminPassword,
			);
		}

		if (options.seedOrganizationName === null) {
			options.seedOrganizationName = await promptText(
				rl,
				"Seed organization name (leave empty to skip)",
				defaultSeedOrganizationName,
				{ allowEmpty: true },
			);
		}
	} finally {
		rl.close();
	}

	return options;
}

function normalizeSummary(options) {
	const appName = options.name?.trim();
	const packageName = options.packageName?.trim();
	const description = options.description?.trim();
	const googleClientId = options.googleClientId?.trim() || "";
	const googleClientSecret = options.googleClientSecret?.trim() || "";
	const betterAuthSecret =
		options.betterAuthSecret?.trim() ||
		"change-me-min-32-chars-long-secret-1234567890";
	const betterAuthUrl =
		options.betterAuthUrl?.trim() || "http://localhost:3000";
	const seedOrganizationName = options.seedOrganizationName?.trim() || "";

	if (!appName) {
		fail("Application name cannot be empty.");
	}

	if (!packageName) {
		fail("Package name cannot be empty.");
	}

	if (!validatePackageName(packageName)) {
		fail(
			"Invalid npm package name. Use lowercase letters, numbers, dashes, dots or a valid scope.",
		);
	}

	if (!description) {
		fail("Description cannot be empty.");
	}

	if (!options.seedAdminEmail?.trim()) {
		fail("Seed admin email cannot be empty.");
	}

	if (!options.seedAdminName?.trim()) {
		fail("Seed admin name cannot be empty.");
	}

	if (!options.seedAdminPassword?.trim()) {
		fail("Seed admin password cannot be empty.");
	}

	if (options.googleAuthEnabled && !googleClientId) {
		fail("Google Client ID is required when Google Auth is enabled.");
	}

	if (betterAuthSecret.length < 32) {
		fail("BETTER_AUTH_SECRET must be at least 32 characters.");
	}

	try {
		new URL(betterAuthUrl);
	} catch {
		fail("BETTER_AUTH_URL must be a valid URL.");
	}

	const appSlug = toAppSlugFromPackageName(packageName);

	if (!appSlug) {
		fail("Could not derive APP_SLUG from package name.");
	}

	return {
		appName,
		appSlug,
		packageName,
		description,
		emailEnabled: Boolean(options.emailEnabled),
		googleAuthEnabled: Boolean(options.googleAuthEnabled),
		googleClientId,
		googleClientSecret,
		betterAuthSecret,
		betterAuthUrl,
		seedAdminEmail: options.seedAdminEmail.trim(),
		seedAdminName: options.seedAdminName.trim(),
		seedAdminPassword: options.seedAdminPassword.trim(),
		seedOrganizationName,
		databaseName: appSlug,
		databaseUser: appSlug,
		sessionCookieName: `${appSlug}.sid`,
	};
}

function collectSummary(options) {
	const summary = normalizeSummary(options);
	const packageJson = readJson("package.json");
	const envExample = readTextIfExists(".env.example");
	const envFile = readTextIfExists(".env");
	const readme = readTextIfExists("README.md");
	const quickStart = readTextIfExists("QUICK_START.md");

	const updates = [
		{
			path: "package.json",
			content: `${JSON.stringify(
				{
					...packageJson,
					name: summary.packageName,
					description: summary.description,
				},
				null,
				2,
			)}\n`,
		},
	];

	const applyEnvSettings = (content) => {
		let nextContent = content;
		nextContent = setEnvValue(nextContent, "APP_NAME", summary.appName);
		nextContent = setEnvValue(nextContent, "APP_SLUG", summary.appSlug);
		nextContent = setEnvValue(
			nextContent,
			"APP_DESCRIPTION",
			summary.description,
		);
		nextContent = setEnvValue(nextContent, "DB_NAME", summary.databaseName);
		nextContent = setEnvValue(nextContent, "DB_USER", summary.databaseUser);
		nextContent = setEnvValue(
			nextContent,
			"SESSION_COOKIE_NAME",
			summary.sessionCookieName,
		);
		nextContent = setEnvValue(
			nextContent,
			"EMAIL_ENABLED",
			String(summary.emailEnabled),
		);
		nextContent = setEnvValue(
			nextContent,
			"GOOGLE_AUTH_ENABLED",
			String(summary.googleAuthEnabled),
		);
		nextContent = setEnvValue(
			nextContent,
			"GOOGLE_CLIENT_ID",
			summary.googleClientId,
		);
		nextContent = setEnvValue(
			nextContent,
			"GOOGLE_CLIENT_SECRET",
			summary.googleClientSecret,
		);
		nextContent = setEnvValue(
			nextContent,
			"BETTER_AUTH_SECRET",
			summary.betterAuthSecret,
		);
		nextContent = setEnvValue(
			nextContent,
			"BETTER_AUTH_URL",
			summary.betterAuthUrl,
		);
		nextContent = setEnvValue(
			nextContent,
			"SEED_ADMIN_EMAIL",
			summary.seedAdminEmail,
		);
		nextContent = setEnvValue(
			nextContent,
			"SEED_ADMIN_NAME",
			summary.seedAdminName,
		);
		nextContent = setEnvValue(
			nextContent,
			"SEED_ADMIN_PASSWORD",
			summary.seedAdminPassword,
		);
		nextContent = setEnvValue(
			nextContent,
			"SEED_ORGANIZATION_NAME",
			summary.seedOrganizationName,
		);

		return ensureTrailingNewline(nextContent);
	};

	if (envExample) {
		updates.push({
			path: ".env.example",
			content: applyEnvSettings(envExample),
		});
	}

	if (envFile) {
		updates.push({
			path: ".env",
			content: applyEnvSettings(envFile),
		});
	}

	if (readme) {
		updates.push({
			path: "README.md",
			content: ensureTrailingNewline(replaceHeading(readme, summary.appName)),
		});
	}

	if (quickStart) {
		updates.push({
			path: "QUICK_START.md",
			content: ensureTrailingNewline(
				replaceQuickStartHeading(quickStart, summary.appName),
			),
		});
	}

	return {
		...summary,
		updates,
	};
}

async function confirmExecution(summary, options) {
	if (options.yes) {
		return true;
	}

	console.log("");
	console.log("Bootstrap summary:");
	console.log(`- App name: ${summary.appName}`);
	console.log(`- Package name: ${summary.packageName}`);
	console.log(`- App slug: ${summary.appSlug}`);
	console.log(`- Email enabled: ${summary.emailEnabled}`);
	console.log(`- Google Auth enabled: ${summary.googleAuthEnabled}`);
	console.log(
		`- Seed organization: ${summary.seedOrganizationName || "(disabled)"}`,
	);

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	try {
		const answer = await rl.question("Apply bootstrap changes? [Y/n] ");
		const normalized = answer.trim().toLowerCase();
		return normalized === "" || normalized === "y" || normalized === "yes";
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
		console.log("Bootstrap cancelled.");
		return;
	}

	const changedFiles = applyUpdates(summary, options.dryRun);

	console.log("");
	console.log(options.dryRun ? "Planned changes:" : "Bootstrap complete:");

	if (changedFiles.length === 0) {
		console.log("- No file changes were necessary.");
		return;
	}

	for (const changedFile of changedFiles) {
		console.log(`- ${changedFile}`);
	}
}

void main();
