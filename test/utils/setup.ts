import { GlobalExceptionFilter } from "@common/filters";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { INestApplication, ValidationPipe, VersioningType } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ThrottlerStorage } from "@nestjs/throttler";
import type { Cache } from "cache-manager";
import { DataSource } from "typeorm";
import { AppModule } from "../../src/app.module";

export async function createTestApp(): Promise<INestApplication> {
	const moduleFixture: TestingModule = await Test.createTestingModule({
		imports: [AppModule],
	})
		.overrideProvider(ThrottlerStorage)
		.useValue({
			increment: async () => ({ totalHits: 0, timeToExpire: 0 }),
		})
		.compile();

	const app = moduleFixture.createNestApplication();

	app.setGlobalPrefix("api", { exclude: ["health"] });
	app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	);
	app.useGlobalFilters(new GlobalExceptionFilter());

	await app.init();
	return app;
}

export async function cleanupDatabase(app: INestApplication): Promise<void> {
	const dataSource = app.get(DataSource);
	const queryRunner = dataSource.createQueryRunner();
	try {
		await queryRunner.query('TRUNCATE "articles" CASCADE');
		await queryRunner.query('TRUNCATE "users" CASCADE');
	} finally {
		await queryRunner.release();
	}
}

async function scanAndDelete(
	client: any,
	pattern: string,
): Promise<void> {
	let cursor = 0;
	do {
		const result = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
		cursor = result.cursor;
		if (result.keys.length > 0) {
			await client.del(result.keys);
		}
	} while (cursor !== 0);
}

export async function clearRedisCache(app: INestApplication): Promise<void> {
	try {
		const cacheManager = app.get<Cache>(CACHE_MANAGER);
		const mgr = cacheManager as any;
		const keyv = mgr.stores?.[0];
		const redisStore = keyv?.opts?.store;
		const client = redisStore?.client;
		if (!client) return;

		await scanAndDelete(client, "articles:*");
		await scanAndDelete(client, "throttler:*");
	} catch {
		// Cache clearing should not break tests — stale cache is acceptable in worst case.
	}
}
