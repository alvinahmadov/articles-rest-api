import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { buildSigninDto, buildSignupDto } from "./utils/factories";
import { cleanupDatabase, clearRedisCache, createTestApp } from "./utils/setup";

describe("Auth (e2e)", () => {
	let app: INestApplication<App>;

	beforeAll(async () => {
		app = await createTestApp();
		await clearRedisCache(app);
	});

	afterAll(async () => {
		await cleanupDatabase(app);
		await app.close();
	});

	describe("POST /api/v1/auth/signup", () => {
		it("should register a new user and return access token", async () => {
			const dto = buildSignupDto({ email: "signup-success@test.com" });

			const response = await request(app.getHttpServer())
				.post("/api/v1/auth/signup")
				.send(dto)
				.expect(201);

			expect(response.body).toMatchObject({
				accessToken: expect.any(String),
				user: {
					id: expect.any(String),
					email: "signup-success@test.com",
				},
			});
		});

		it("should reject duplicate email with 409", async () => {
			const dto = buildSignupDto({ email: "duplicate@test.com" });
			await request(app.getHttpServer())
				.post("/api/v1/auth/signup")
				.send(dto)
				.expect(201);

			const response = await request(app.getHttpServer())
				.post("/api/v1/auth/signup")
				.send(dto)
				.expect(409);

			expect(response.body).toMatchObject({
				statusCode: 409,
				message: expect.stringContaining("already registered"),
			});
		});

		it("should return 400 when email is invalid", async () => {
			const dto = buildSignupDto({ email: "not-an-email" });

			const response = await request(app.getHttpServer())
				.post("/api/v1/auth/signup")
				.send(dto)
				.expect(400);

			expect(response.body).toMatchObject({
				statusCode: 400,
			});
		});

		it("should return 400 when password is too short", async () => {
			const dto = buildSignupDto({ password: "short" });

			const response = await request(app.getHttpServer())
				.post("/api/v1/auth/signup")
				.send(dto)
				.expect(400);

			expect(response.body).toMatchObject({
				statusCode: 400,
			});
		});

		it("should reject unknown fields with 400", async () => {
			const response = await request(app.getHttpServer())
				.post("/api/v1/auth/signup")
				.send({
					email: "test@test.com",
					password: "password123",
					unknownField: "should not be allowed",
				})
				.expect(400);

			expect(response.body).toMatchObject({
				statusCode: 400,
			});
		});
	});

	describe("POST /api/v1/auth/signin", () => {
		const email = "signin-e2e@test.com";
		const password = "password123";

		beforeAll(async () => {
			await request(app.getHttpServer())
				.post("/api/v1/auth/signup")
				.send(buildSignupDto({ email, password }))
				.expect(201);
		});

		it("should authenticate valid credentials and return access token", async () => {
			const dto = buildSigninDto({ email, password });

			const response = await request(app.getHttpServer())
				.post("/api/v1/auth/signin")
				.send(dto)
				.expect(200);

			expect(response.body).toMatchObject({
				accessToken: expect.any(String),
				user: {
					id: expect.any(String),
					email,
				},
			});
		});

		it("should return 401 for non-existent email", async () => {
			const dto = buildSigninDto({ email: "nobody@test.com", password });

			const response = await request(app.getHttpServer())
				.post("/api/v1/auth/signin")
				.send(dto)
				.expect(401);

			expect(response.body).toMatchObject({
				statusCode: 401,
			});
		});

		it("should return 401 for wrong password", async () => {
			const dto = buildSigninDto({ email, password: "wrongpassword123" });

			const response = await request(app.getHttpServer())
				.post("/api/v1/auth/signin")
				.send(dto)
				.expect(401);

			expect(response.body).toMatchObject({
				statusCode: 401,
			});
		});

		it("should not reveal whether email exists in error message", async () => {
			const dto = buildSigninDto({ email: "doesnotexist@test.com", password: "anypassword123" });

			const response = await request(app.getHttpServer())
				.post("/api/v1/auth/signin")
				.send(dto)
				.expect(401);

			expect(response.body.message).toBe("Invalid credentials");
		});
	});
});
