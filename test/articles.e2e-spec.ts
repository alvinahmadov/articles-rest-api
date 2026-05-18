import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import {
	buildCreateArticleDto,
	buildUpdateArticleDto,
	createTestArticle,
	createTestUser,
} from "./utils/factories";
import { cleanupDatabase, clearRedisCache, createTestApp } from "./utils/setup";

describe("Articles (e2e)", () => {
	let app: INestApplication<App>;
	let userA: { accessToken: string; userId: string; email: string };

	beforeAll(async () => {
		app = await createTestApp();
		await clearRedisCache(app);
		userA = await createTestUser(app, { email: "articles-owner@test.com" });
	});

	afterAll(async () => {
		await cleanupDatabase(app);
		await app.close();
	});

	describe("GET /api/v1/articles", () => {
		beforeAll(async () => {
			await createTestArticle(app, userA.accessToken, { title: "List-Test-1" });
			await createTestArticle(app, userA.accessToken, { title: "List-Test-2" });
		});

		it("should return empty paginated list when no articles match filter", async () => {
			const response = await request(app.getHttpServer())
				.get("/api/v1/articles")
				.query({ author: "00000000-0000-0000-0000-000000000000" })
				.expect(200);

			expect(response.body).toMatchObject({
				data: [],
				total: 0,
				page: 1,
				limit: 10,
				totalPages: 0,
			});
		});

		it("should return paginated list with articles", async () => {
			const response = await request(app.getHttpServer())
				.get("/api/v1/articles")
				.expect(200);

			expect(response.body.data.length).toBeGreaterThanOrEqual(2);
			expect(response.body.total).toBeGreaterThanOrEqual(2);
		});

		it("should filter by author", async () => {
			const response = await request(app.getHttpServer())
				.get("/api/v1/articles")
				.query({ author: userA.userId })
				.expect(200);

			expect(response.body.data.length).toBeGreaterThanOrEqual(1);
			expect(response.body.data.every((a: any) => a.authorId === userA.userId)).toBe(true);
		});

		it("should filter by title (case-insensitive partial match)", async () => {
			const response = await request(app.getHttpServer())
				.get("/api/v1/articles")
				.query({ title: "list-test" })
				.expect(200);

			expect(response.body.data.length).toBeGreaterThanOrEqual(1);
			expect(
				response.body.data.every((a: any) =>
					a.title.toLowerCase().includes("list-test"),
				),
			).toBe(true);
		});

		it("should respect pagination parameters", async () => {
			const response = await request(app.getHttpServer())
				.get("/api/v1/articles")
				.query({ page: 1, limit: 1 })
				.expect(200);

			expect(response.body.data.length).toBeLessThanOrEqual(1);
			expect(response.body.page).toBe(1);
			expect(response.body.limit).toBe(1);
		});
	});

	describe("GET /api/v1/articles/:id", () => {
		let articleId: string;

		beforeAll(async () => {
			const article = await createTestArticle(app, userA.accessToken, {
				title: "Get-By-Id-Test",
			});
			articleId = article.id;
		});

		it("should return article by id", async () => {
			const response = await request(app.getHttpServer())
				.get(`/api/v1/articles/${articleId}`)
				.expect(200);

			expect(response.body).toMatchObject({
				id: articleId,
				title: "Get-By-Id-Test",
				authorId: userA.userId,
			});
		});

		it("should return 404 for non-existent article", async () => {
			const response = await request(app.getHttpServer())
				.get("/api/v1/articles/00000000-0000-0000-0000-000000000000")
				.expect(404);

			expect(response.body).toMatchObject({
				statusCode: 404,
			});
		});
	});

	describe("POST /api/v1/articles", () => {
		it("should create an article when authenticated", async () => {
			const dto = buildCreateArticleDto({ title: "Create-Auth-Test" });

			const response = await request(app.getHttpServer())
				.post("/api/v1/articles")
				.set("Authorization", `Bearer ${userA.accessToken}`)
				.send(dto)
				.expect(201);

			expect(response.body).toMatchObject({
				title: "Create-Auth-Test",
				authorId: userA.userId,
			});
			expect(response.body.id).toEqual(expect.any(String));
		});

		it("should create an article with scheduled publish date", async () => {
			const dto = buildCreateArticleDto({
				title: "Scheduled-Article",
				publishedAt: "2026-12-01T00:00:00.000Z",
			});

			const response = await request(app.getHttpServer())
				.post("/api/v1/articles")
				.set("Authorization", `Bearer ${userA.accessToken}`)
				.send(dto)
				.expect(201);

			expect(response.body.publishedAt).toBe("2026-12-01T00:00:00.000Z");
		});

		it("should return 401 without auth token", async () => {
			const dto = buildCreateArticleDto();

			const response = await request(app.getHttpServer())
				.post("/api/v1/articles")
				.send(dto)
				.expect(401);

			expect(response.body).toMatchObject({
				statusCode: 401,
			});
		});

		it("should return 400 for invalid data", async () => {
			const response = await request(app.getHttpServer())
				.post("/api/v1/articles")
				.set("Authorization", `Bearer ${userA.accessToken}`)
				.send({ title: 12345 })
				.expect(400);

			expect(response.body).toMatchObject({
				statusCode: 400,
			});
		});
	});

	describe("PATCH /api/v1/articles/:id", () => {
		let articleId: string;

		beforeAll(async () => {
			const article = await createTestArticle(app, userA.accessToken, {
				title: "Update-Test",
			});
			articleId = article.id;
		});

		it("should update article when authenticated and is owner", async () => {
			const dto = buildUpdateArticleDto({ title: "Updated-By-Owner" });

			const response = await request(app.getHttpServer())
				.patch(`/api/v1/articles/${articleId}`)
				.set("Authorization", `Bearer ${userA.accessToken}`)
				.send(dto)
				.expect(200);

			expect(response.body).toMatchObject({
				id: articleId,
				title: "Updated-By-Owner",
			});
		});

		it("should return 401 without auth token", async () => {
			const dto = buildUpdateArticleDto();

			await request(app.getHttpServer())
				.patch(`/api/v1/articles/${articleId}`)
				.send(dto)
				.expect(401);
		});

		it("should return 404 for non-existent article", async () => {
			const response = await request(app.getHttpServer())
				.patch("/api/v1/articles/00000000-0000-0000-0000-000000000000")
				.set("Authorization", `Bearer ${userA.accessToken}`)
				.send({ title: "Nope" })
				.expect(404);

			expect(response.body).toMatchObject({
				statusCode: 404,
			});
		});
	});

	describe("DELETE /api/v1/articles/:id", () => {
		it("should delete article when authenticated and is owner", async () => {
			const article = await createTestArticle(app, userA.accessToken, {
				title: "Delete-Owner-Test",
			});

			await request(app.getHttpServer())
				.delete(`/api/v1/articles/${article.id}`)
				.set("Authorization", `Bearer ${userA.accessToken}`)
				.expect(204);
		});

		it("should return 401 without auth token", async () => {
			const article = await createTestArticle(app, userA.accessToken, {
				title: "Delete-No-Auth-Test",
			});

			await request(app.getHttpServer())
				.delete(`/api/v1/articles/${article.id}`)
				.expect(401);
		});

		it("should return 404 for non-existent article", async () => {
			const response = await request(app.getHttpServer())
				.delete("/api/v1/articles/00000000-0000-0000-0000-000000000000")
				.set("Authorization", `Bearer ${userA.accessToken}`)
				.expect(404);

			expect(response.body).toMatchObject({
				statusCode: 404,
			});
		});
	});

	describe("ownership guard", () => {
		let userB: { accessToken: string; userId: string; email: string };
		let userBArticleId: string;

		beforeAll(async () => {
			userB = await createTestUser(app, { email: "other-user@test.com" });
			const article = await createTestArticle(app, userB.accessToken, {
				title: "Other-User-Article",
			});
			userBArticleId = article.id;
		});

		it("should prevent user A from updating user B's article (404)", async () => {
			const response = await request(app.getHttpServer())
				.patch(`/api/v1/articles/${userBArticleId}`)
				.set("Authorization", `Bearer ${userA.accessToken}`)
				.send({ title: "Hacked Title" })
				.expect(404);

			expect(response.body).toMatchObject({
				statusCode: 404,
			});
		});

		it("should prevent user A from deleting user B's article (404)", async () => {
			const response = await request(app.getHttpServer())
				.delete(`/api/v1/articles/${userBArticleId}`)
				.set("Authorization", `Bearer ${userA.accessToken}`)
				.expect(404);

			expect(response.body).toMatchObject({
				statusCode: 404,
			});
		});
	});
});
