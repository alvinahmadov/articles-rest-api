import { JwtStrategy } from "@api/auth/strategies/jwt.strategy";

import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
	imports: [
		UsersModule,
		PassportModule.register({ defaultStrategy: "jwt" }),
		JwtModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				secret: configService.get<string>("app.jwt.secret")!,
				signOptions: {
					// expiresIn from env is a string like "1h" — JwtModule expects a number (seconds) or a StringValue literal.
					expiresIn: configService.get<string>("app.jwt.expiresIn") as any,
				},
			}),
		}),
	],
	controllers: [AuthController],
	providers: [AuthService, JwtStrategy],
	exports: [AuthService, PassportModule, JwtModule],
})
export class AuthModule {}
