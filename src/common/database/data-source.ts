import { config } from "dotenv";
import { join } from "path";
import { DataSource, DataSourceOptions } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

// It can be problematic if we avoid using .env files
// and instead use only GitHub Secrets as environment variables.
// But the workaround is to command in GitHub CI/CD workflows
// to create a .env file while building and use it.
// But for the sake of simplicity of the test task we use .env file.
config({ path: join(__dirname, "../../.env") });

export const dataSourceOptions: DataSourceOptions = {
	type: "postgres",
	host: process.env.DB_HOST ?? "localhost",
	port: parseInt(process.env.DB_PORT ?? "5432", 10),
	username: process.env.DB_USER ?? "postgres",
	password: process.env.DB_PASS ?? "secret",
	database: process.env.DB_NAME ?? "articles_db",
	// TypeORM CLI commands don't boot the NestJS AppModule.
	// They look for a standalone DataSource file.
	// So we must set naming strategy here too.
	namingStrategy: new SnakeNamingStrategy(),
	entities: [join(__dirname, "../../**/*.entity{.ts,.js}")],
	migrations: [join(__dirname, "migrations/*{.ts,.js}")],
	// In production, synchronization always should be - it prevents accidental data loss
	// from column renames, type changes, or table drops that TypeORM's sync logic cannot
	// safely infer. But in development mode it can be enabled.
	synchronize: false,
	// This is a separate DataSource config for TypeORM CLI, not the NestJS runtime config.
	logging: false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
