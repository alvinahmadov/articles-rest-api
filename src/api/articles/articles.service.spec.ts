import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { randomUUID } from "node:crypto";
import { Repository } from "typeorm";

import { Article } from "../../domain/entities/article.entity";
import { ArticlesService } from "./articles.service";

describe("ArticlesService", () => {
	let service: ArticlesService;
	let repository: jest.Mocked<Repository<Article>>;
	let cacheManager: jest.Mocked<any>;

	const mockArticle = {
		id: randomUUID().toString(),
		title: "Test Article",
		description: "Test content",
		publishedAt: null,
		authorId: "author-uuid",
		createdAt: new Date(),
		updatedAt: new Date(),
		author: {
			id: "author-uuid",
			email: "author@test.com",
			passwordHash: "hashed",
			updatedAt: new Date(),
			createdAt: new Date(),
		},
	} as Article;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ArticlesService,
				{
					provide: getRepositoryToken(Article),
					useValue: {
						create: jest.fn(),
						save: jest.fn(),
						findOne: jest.fn(),
						delete: jest.fn(),
						createQueryBuilder: jest.fn(),
					},
				},
				{
					provide: CACHE_MANAGER,
					useValue: {
						get: jest.fn(),
						set: jest.fn(),
						del: jest.fn(),
						store: {
							client: {
								scan: jest.fn(),
								del: jest.fn(),
							},
						},
					},
				},
			],
		}).compile();

		service = module.get<ArticlesService>(ArticlesService);
		repository = module.get(getRepositoryToken(Article));
		cacheManager = module.get(CACHE_MANAGER);
	});

	describe("create", () => {
		it("should create and return an article", async () => {
			const dto = { title: "New Article", description: "Content" };
			const authorId = "author-uuid";

			repository.create.mockReturnValue(mockArticle);
			repository.save.mockResolvedValue(mockArticle);
			cacheManager.del.mockResolvedValue(undefined);

			const result = await service.create(dto, authorId);

			expect(repository.create).toHaveBeenCalledWith({
				title: dto.title,
				description: dto.description,
				publishedAt: null,
				authorId,
			});
			expect(result).toEqual(mockArticle);
		});

		it("should parse publishedAt when provided", async () => {
			const dto = {
				title: "Scheduled Article",
				description: "Content",
				publishedAt: "2026-06-01T00:00:00.000Z",
			};
			const authorId = "author-uuid";
			const expectedDate = new Date(dto.publishedAt);

			repository.create.mockReturnValue(mockArticle);
			repository.save.mockResolvedValue(mockArticle);

			await service.create(dto, authorId);

			expect(repository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					publishedAt: expectedDate,
				}),
			);
		});
	});

	describe("findAll", () => {
		it("should return paginated articles", async () => {
			const filters = { page: 1, limit: 10 };
			const qb: any = {
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				skip: jest.fn().mockReturnThis(),
				take: jest.fn().mockReturnThis(),
				orderBy: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				getManyAndCount: jest.fn().mockResolvedValue([[mockArticle], 1]),
			};

			repository.createQueryBuilder.mockReturnValue(qb);

			const result = await service.findAll(filters);

			expect(result.data).toEqual([mockArticle]);
			expect(result.total).toBe(1);
			expect(result.page).toBe(1);
			expect(result.limit).toBe(10);
			expect(result.totalPages).toBe(1);
		});

		it("should apply filters to the query", async () => {
			const filters = {
				page: 1,
				limit: 10,
				author: "author-uuid",
				title: "Test",
				publishedFrom: "2026-01-01T00:00:00.000Z",
				publishedTo: "2026-12-31T00:00:00.000Z",
			};
			const qb: any = {
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				skip: jest.fn().mockReturnThis(),
				take: jest.fn().mockReturnThis(),
				orderBy: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				getManyAndCount: jest.fn().mockResolvedValue([[mockArticle], 1]),
			};

			repository.createQueryBuilder.mockReturnValue(qb);

			await service.findAll(filters);

			expect(qb.andWhere).toHaveBeenCalledTimes(4);
			expect(qb.andWhere).toHaveBeenCalledWith("article.authorId = :author", {
				author: "author-uuid",
			});
			expect(qb.andWhere).toHaveBeenCalledWith("article.title ILIKE :title", { title: "%Test%" });
		});

		it("should return from cache when available", async () => {
			const filters = { page: 1, limit: 10 };
			const cachedResult = {
				data: [mockArticle],
				total: 1,
				page: 1,
				limit: 10,
				totalPages: 1,
			};

			cacheManager.get.mockResolvedValue(cachedResult);

			const result = await service.findAll(filters);

			expect(repository.createQueryBuilder).not.toHaveBeenCalled();
			expect(result).toEqual(cachedResult);
		});
	});

	describe("findOne", () => {
		it("should return an article by id", async () => {
			repository.findOne.mockResolvedValue(mockArticle);

			const result = await service.findOne("article-uuid");

			expect(repository.findOne).toHaveBeenCalledWith({
				where: { id: "article-uuid" },
				relations: ["author"],
			});
			expect(result).toEqual(mockArticle);
		});

		it("should throw NotFoundException when article does not exist", async () => {
			repository.findOne.mockResolvedValue(null);

			await expect(service.findOne("nonexistent-id")).rejects.toThrow(NotFoundException);
		});

		it("should return from cache when available", async () => {
			cacheManager.get.mockResolvedValue(mockArticle);

			const result = await service.findOne("article-uuid");

			expect(repository.findOne).not.toHaveBeenCalled();
			expect(result).toEqual(mockArticle);
		});
	});

	describe("update", () => {
		const userId = "author-uuid";

		it("should update and return the article", async () => {
			const dto = { title: "Updated Title" };
			const existingArticle = { ...mockArticle };

			repository.findOne.mockResolvedValue(existingArticle);
			repository.save.mockResolvedValue({ ...existingArticle, title: dto.title });

			const result = await service.update("article-uuid", userId, dto);

			expect(repository.findOne).toHaveBeenCalledWith({
				where: { id: "article-uuid", authorId: userId },
			});
			expect(result.title).toBe("Updated Title");
		});

		it("should throw NotFoundException when article does not exist", async () => {
			repository.findOne.mockResolvedValue(null);

			await expect(service.update("nonexistent-id", userId, { title: "Nope" })).rejects.toThrow(
				NotFoundException,
			);
		});
	});

	describe("remove", () => {
		const userId = "author-uuid";

		it("should delete an article", async () => {
			repository.delete.mockResolvedValue({ affected: 1, raw: {} });

			await expect(service.remove("article-uuid", userId)).resolves.toBeUndefined();
		});

		it("should throw NotFoundException when article does not exist", async () => {
			repository.delete.mockResolvedValue({ affected: 0, raw: {} });

			await expect(service.remove("nonexistent-id", userId)).rejects.toThrow(NotFoundException);
		});
	});
});
