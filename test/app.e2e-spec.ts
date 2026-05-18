import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { cleanupDatabase, createTestApp } from "./utils/setup";

describe("App (e2e)", () => {
	let app: INestApplication<App>;

	beforeAll(async () => {
		app = await createTestApp();
	});

	afterAll(async () => {
		await cleanupDatabase(app);
		await app.close();
	});

	it("should return 404 for unknown routes", async () => {
		await request(app.getHttpServer()).get("/unknown-route").expect(404);
	});

	it("should respond with 200 on api health endpoint", async () => {
		// The API is configured with global prefix 'api' and versioning
		await request(app.getHttpServer()).get("/api/v1/articles").expect(200);
	});
});
