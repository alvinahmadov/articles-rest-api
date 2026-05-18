import { RedisConstants } from "@common/constants/redis.constants";
import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Global()
@Module({
	providers: [
		{
			provide: RedisConstants.CLIENT_NAME,
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => {
				return new Redis({
					host: configService.get<string>("app.redis.host"),
					port: configService.get<number>("app.redis.port"),
				});
			},
		},
	],
	exports: [RedisConstants.CLIENT_NAME],
})
export class RedisModule {}
