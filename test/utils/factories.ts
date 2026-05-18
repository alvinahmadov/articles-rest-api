import { INestApplication } from "@nestjs/common";
import request from "supertest";

interface CreateUserParams {
	email?: string;
	password?: string;
	firstName?: string;
	lastName?: string;
}

interface CreateArticleParams {
	title?: string;
	description?: string;
	publishedAt?: string;
}

export function buildSignupDto(overrides: Partial<CreateUserParams> = {}) {
	return {
		email: "e2e@test.com",
		password: "password123",
		firstName: "E2E",
		lastName: "Test",
		...overrides,
	};
}

export function buildSigninDto(overrides: Partial<CreateUserParams> = {}) {
	return {
		email: "e2e@test.com",
		password: "password123",
		...overrides,
	};
}

export function buildCreateArticleDto(overrides: Partial<CreateArticleParams> = {}) {
	return {
		title: "E2E Test Article",
		description: "Content created during e2e testing",
		...overrides,
	};
}

export function buildUpdateArticleDto(overrides: Partial<CreateArticleParams> = {}) {
	return {
		title: "Updated E2E Article",
		description: "Updated content",
		...overrides,
	};
}

export async function createTestUser(
	app: INestApplication,
	overrides: Partial<CreateUserParams> = {},
): Promise<{ accessToken: string; userId: string; email: string }> {
	const dto = buildSignupDto(overrides);
	const server = app.getHttpServer();
	const response = await request(server).post("/api/v1/auth/signup").send(dto).expect(201);
	return {
		accessToken: response.body.accessToken,
		userId: response.body.user.id,
		email: response.body.user.email,
	};
}

export async function createTestArticle(
	app: INestApplication,
	accessToken: string,
	overrides: Partial<CreateArticleParams> = {},
): Promise<{ id: string; title: string }> {
	const dto = buildCreateArticleDto(overrides);
	const server = app.getHttpServer();
	const response = await request(server)
		.post("/api/v1/articles")
		.set("Authorization", `Bearer ${accessToken}`)
		.send(dto)
		.expect(201);
	return {
		id: response.body.id,
		title: response.body.title,
	};
}
