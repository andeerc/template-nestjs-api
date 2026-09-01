import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "postgresql",
	schema: [
		"./src/shared/infrastructure/database/schemas/*",
		"./src/shared/infrastructure/database/schemas/auth/*",
	],
	out: "./src/shared/infrastructure/database/migrations",
	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},
	verbose: true,
	strict: true,
});
