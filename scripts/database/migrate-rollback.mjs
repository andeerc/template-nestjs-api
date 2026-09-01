console.log(
	"Drizzle rollback not automatically supported. To rollback, manually revert last SQL file and run drizzle-kit migrate with previous journal.",
);
console.log(
	"Archived Objx migrations are in src/shared/infrastructure/database/migrations/_objx_backup",
);
process.exit(0);
