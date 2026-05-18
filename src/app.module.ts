import { ArticlesModule } from "@api/articles/articles.module";
import { AuthModule } from "@api/auth/auth.module";
import { UsersModule } from "@api/users/users.module";

import configuration from "@common/config/configuration";
import { RedisConstants } from "@common/constants";
import { RedisModule } from "@common/redis/redis.module";
import { createKeyv } from "@keyv/redis";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";

import { CacheModule } from "@nestjs/cache-manager";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";
import Redis from "ioredis";
import { join } from "path";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [configuration],
			envFilePath: join(__dirname, "..", ".env"),
		}),
		RedisModule,
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],

			useFactory: (configService: ConfigService) => ({
				type: "postgres",
				host: configService.get<string>("app.database.host"),
				port: configService.get<number>("app.database.port"),
				username: configService.get<string>("app.database.user"),
				password: configService.get<string>("app.database.password"),
				database: configService.get<string>("app.database.name"),
				// By convenience all table records should be snake_case.
				// Default for typeorm is using as is.
				namingStrategy: new SnakeNamingStrategy(),
				entities: [join(__dirname, "**", "*.entity.{ts,js}")],
				// Setting to false is non-negotiable in prod because TypeORM's auto-sync can
				// silently drop columns or rename them incorrectly, causing data loss.
				synchronize: false,
				// Always use migrations for schema changes.
				logging: configService.get<string>("NODE_ENV") === "development",
			}),
		}),
		CacheModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			isGlobal: true,
			useFactory: (configService: ConfigService) => {
				const redisHost = configService.get<string>("app.redis.host")!;
				const redisPort = configService.get<number>("app.redis.port")!;
				const redisUrl = `redis://${redisHost}:${redisPort}`;
				return {
					stores: [createKeyv(redisUrl)],
				};
			},
		}),
		ThrottlerModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService, RedisConstants.CLIENT_NAME],
			useFactory: (configService: ConfigService, redis: Redis) => ({
				storage: new ThrottlerStorageRedisService(redis),
				throttlers: [
					{
						name: "default",
						ttl: configService.get<number>("app.throttle.ttl")!,
						limit: configService.get<number>("app.throttle.globalLimit")!,
					},
					{
						name: "auth",
						ttl: configService.get<number>("app.throttle.ttl")!,
						limit: configService.get<number>("app.throttle.authLimit")!,
					},
					{
						name: "articleWrite",
						ttl: configService.get<number>("app.throttle.ttl")!,
						limit: configService.get<number>("app.throttle.articleWriteLimit")!,
					},
				],
			}),
		}),
		AuthModule,
		UsersModule,
		ArticlesModule,
	],
	providers: [
		{
			provide: APP_GUARD,
			useClass: ThrottlerGuard,
		},
	],
})
export class AppModule {}
