import { UsersService } from "@api/users/users.service";
import { ExtractJwt, Strategy } from "passport-jwt";

import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";

interface JwtPayload {
	sub: string;
	email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(
		configService: ConfigService,
		private readonly usersService: UsersService,
	) {
		super({
			// Standard Bearer token extraction from 'Authorization' header.
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			// Strict expiration check to prevent stale session usage.
			ignoreExpiration: false,
			// Fallback provided for test project; production always should use environment variables
			// Better saved in GitHub Secrets when doing CI/CD workflow so it doesn't get exposed.
			secretOrKey: configService.get<string>("app.jwt.secret")!,
		});
	}

	/**
	 * Passport automatically invokes this after the JWT signature and expiry are verified.
	 * Here we perform a "database check" to ensure the user still exists and is active.
	 *
	 * @param payload Decoded JWT claims.
	 * @returns The user object to be injected into the Request.
	 */
	async validate(payload: JwtPayload) {
		const user = await this.usersService.findById(payload.sub);
		// If the user was deleted or deactivated since the token was issued
		if (!user) {
			throw new UnauthorizedException("User not found");
		}
		// Return a sanitized user object to avoid bloating the Request object.
		return { id: user.id, email: user.email };
	}
}
