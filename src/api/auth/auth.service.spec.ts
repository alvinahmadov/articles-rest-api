import { AuthConstants } from "@common/constants";
import * as bcrypt from "bcrypt";

import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";

import { UsersService } from "../users/users.service";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
	let service: AuthService;
	let usersService: jest.Mocked<UsersService>;
	let jwtService: jest.Mocked<JwtService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AuthService,
				{
					provide: UsersService,
					useValue: {
						create: jest.fn(),
						findByEmail: jest.fn(),
					},
				},
				{
					provide: JwtService,
					useValue: {
						sign: jest.fn().mockReturnValue("mock-jwt-token"),
					},
				},
			],
		}).compile();

		service = module.get<AuthService>(AuthService);
		usersService = module.get(UsersService);
		jwtService = module.get(JwtService);
	});

	describe("register", () => {
		it("should create a user and return an access token", async () => {
			const dto = { email: "test@example.com", password: "password123" };
			const hashedPassword = await bcrypt.hash(dto.password, AuthConstants.SALT_ROUNDS);
			const mockUser = {
				id: "uuid-123",
				email: dto.email,
				firstName: "John",
				passwordHash: hashedPassword,
				createdAt: new Date(),
			};

			// @ts-ignore
			usersService.create.mockResolvedValue(mockUser);

			const result = await service.signup(dto);

			expect(usersService.create).toHaveBeenCalledWith({
				email: dto.email,
				passwordHash: expect.any(String),
				firstName: undefined,
				lastName: undefined,
			});
			expect(jwtService.sign).toHaveBeenCalledWith({
				sub: mockUser.id,
				email: mockUser.email,
			});
			expect(result).toEqual({
				accessToken: "mock-jwt-token",
				user: { id: mockUser.id, email: mockUser.email },
			});
		});

		it("should throw ConflictException when email already exists", async () => {
			const dto = { email: "exists@example.com", password: "password123" };

			usersService.create.mockRejectedValue(
				// @ts-ignore
				new ConflictException("A user with this email already exists"),
			);

			await expect(service.signup(dto)).rejects.toThrow(ConflictException);
		});
	});

	describe("login", () => {
		it("should return an access token for valid credentials", async () => {
			const dto = { email: "test@example.com", password: "correct-password" };
			const hashedPassword = await bcrypt.hash(dto.password, AuthConstants.SALT_ROUNDS);
			const mockUser = {
				id: "uuid-123",
				email: dto.email,
				firstName: "John",
				passwordHash: hashedPassword,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			usersService.findByEmail.mockResolvedValue(mockUser);

			const result = await service.signin(dto);

			expect(jwtService.sign).toHaveBeenCalledWith({
				sub: mockUser.id,
				email: mockUser.email,
			});
			expect(result).toEqual({
				accessToken: "mock-jwt-token",
				user: { id: mockUser.id, email: mockUser.email },
			});
		});

		it("should throw UnauthorizedException when user does not exist", async () => {
			const dto = { email: "unknown@example.com", password: "some-password" };

			usersService.findByEmail.mockResolvedValue(null);

			await expect(service.signin(dto)).rejects.toThrow(UnauthorizedException);
		});

		it("should throw UnauthorizedException when password is wrong", async () => {
			const dto = { email: "test@example.com", password: "wrong-password" };
			const hashedPassword = await bcrypt.hash("correct-password", AuthConstants.SALT_ROUNDS);
			const mockUser = {
				id: "uuid-123",
				email: dto.email,
				firstName: "John",
				passwordHash: hashedPassword,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			usersService.findByEmail.mockResolvedValue(mockUser);

			await expect(service.signin(dto)).rejects.toThrow(UnauthorizedException);
		});

		it("should not reveal whether the email exists in error message", async () => {
			const nonExistentEmail = "nobody@example.com";
			const dto = { email: nonExistentEmail, password: "any-password" };

			usersService.findByEmail.mockResolvedValue(null);

			await expect(service.signin(dto)).rejects.toThrow("Invalid credentials");
		});
	});
});
