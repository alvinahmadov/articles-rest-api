import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiCreatedResponse, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { SignInDto } from "./dto/signin.dto";
import { SignUpDto } from "./dto/signup.dto";

@ApiTags("Auth")
@Controller({
	path: "auth",
	version: "1",
})
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Throttle({
		default: {
			limit: 5,
			ttl: 60_000,
		},
	})
	@Post("signup")
	@ApiOperation({
		summary: "Register a new user",
		description:
			"Creates a new user account with the provided credentials. " +
			"Returns a JWT access token and partial user data. Rate-limited to 5 requests per 60 seconds.",
	})
	@ApiCreatedResponse({
		description: "User successfully registered",
		schema: {
			type: "object",
			properties: {
				accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIs..." },
				user: {
					type: "object",
					properties: {
						id: { type: "string", format: "uuid" },
						email: { type: "string", format: "email" },
					},
				},
			},
		},
	})
	@ApiResponse({
		status: 400,
		description: "Validation error (invalid email, short password, or unknown fields)",
	})
	@ApiResponse({ status: 409, description: "Conflict — a user with this email already exists" })
	async signUp(@Body() dto: SignUpDto) {
		return await this.authService.signup(dto);
	}

	@Throttle({
		default: {
			limit: 5,
			ttl: 60_000,
		},
	})
	@Post("signin")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Authenticate an existing user",
		description:
			"Validates email and password credentials. " +
			"Returns a JWT access token and partial user data. " +
			"Uses a single error message for both missing email and wrong password to prevent email enumeration. " +
			"Rate-limited to 5 requests per 60 seconds.",
	})
	@ApiCreatedResponse({
		description: "Authentication successful",
		schema: {
			type: "object",
			properties: {
				accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIs..." },
				user: {
					type: "object",
					properties: {
						id: { type: "string", format: "uuid" },
						email: { type: "string", format: "email" },
					},
				},
			},
		},
	})
	@ApiResponse({ status: 400, description: "Validation error" })
	@ApiResponse({ status: 401, description: "Invalid credentials (non-revealing)" })
	async signin(@Body() dto: SignInDto) {
		return await this.authService.signin(dto);
	}
}
