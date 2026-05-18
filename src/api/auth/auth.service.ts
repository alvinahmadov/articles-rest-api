/**
 * Service class responsible for handling authentication logic.
 */

import { AuthConstants } from "@common/constants";
import * as bcrypt from "bcrypt";

import { ConflictException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { UsersService } from "../users/users.service";
import { SignInDto } from "./dto/signin.dto";
import { SignUpDto } from "./dto/signup.dto";

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name);

	constructor(
		private readonly usersService: UsersService,
		private readonly jwtService: JwtService,
	) {}

	/**
	 * Registers a new user and generates authentication tokens.
	 * @param {SignUpDto} dto - The data transfer object containing user registration
	 * details (email and password).
	 * @returns A promise that resolves with the access token and user information.
	 * @throws {ConflictException} If a user with the given email already exists.
	 */
	async signup(dto: SignUpDto) {
		// Check if user registers for the first time.
		const existing = await this.usersService.findByEmail(dto.email);
		if (existing) {
			// User exists in the database, so we throw an error.
			throw new ConflictException(`User with email ${dto.email} is already registered.`);
		}

		const passwordHash = await bcrypt.hash(dto.password, AuthConstants.SALT_ROUNDS);
		// We create a user entity by provided dto and calculated password hash.
		const user = await this.usersService.create({
			email: dto.email,
			passwordHash: passwordHash,
			firstName: dto.firstName,
			lastName: dto.lastName,
		});

		this.logger.log(`User registered: ${user.email}`);

		// Then generate access token and return with partial user data.
		// But in production service we usually don't send access token back to
		// the newly registered user. Instead, we send it in verification email
		// using queues for background job.
		return this.generateToken({ id: user.id, email: user.email });
	}

	/**
	 * Login logic to handle user login process by checking email and hashed password
	 * with database records.
	 * */
	async signin(dto: SignInDto) {
		// First we check that user with provided email exists in database.
		const user = await this.usersService.findByEmail(dto.email);
		// Then use a single error message regardless of whether the email exists or
		// the password is wrong.
		// This prevents attackers from enumerating registered emails via error messages.
		if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
			// There's no user in database with provided email.
			throw new UnauthorizedException("Invalid credentials");
		}

		this.logger.log(`User logged in: ${user.email}`);
		// Then we proceed with access token generation and partial user data
		return this.generateToken({ id: user.id, email: user.email });
	}

	private generateToken(user: { id: string; email: string }) {
		const payload = { sub: user.id, email: user.email };
		return {
			accessToken: this.jwtService.sign(payload),
			// Might be required by the requester
			user: { id: user.id, email: user.email },
		};
	}
}
