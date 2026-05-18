import { PaginationConstants } from "@common/constants";
import { PaginatedResult } from "@common/pagination/paginated-result.interface";

import { Article } from "@domain/entities/article.entity";

import { CACHE_MANAGER }      from "@nestjs/cache-manager";
import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository }   from "@nestjs/typeorm";
import type { Cache } from "cache-manager";
import { Repository, SelectQueryBuilder } from "typeorm";
import { ArticleFilterDto, CreateArticleDto, UpdateArticleDto } from "./dto";

@Injectable()
export class ArticlesService {
	private readonly logger = new Logger(ArticlesService.name);
	
	constructor(
		@InjectRepository(Article)
		private readonly articlesRepository: Repository<Article>,
		@Inject(CACHE_MANAGER)
		private readonly cacheManager: Cache,
	) {}

	async create(dto: CreateArticleDto, authorId: string): Promise<Article> {
		const article = this.articlesRepository.create({
			title: dto.title,
			description: dto.description,
			publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
			authorId,
		});
		
		this.logger.log(`Article created: '${article.title}'`);
		return await this.articlesRepository.save(article);
	}

	async findAll(filters: ArticleFilterDto): Promise<PaginatedResult<Article>> {
		const cacheKey = `articles:list:${JSON.stringify(filters)}`;
		const cached = await this.cacheManager.get<PaginatedResult<Article>>(cacheKey);
		if (cached) {
			return cached;
		}

		const {
			page = PaginationConstants.PAGE_MIN,
			limit = PaginationConstants.PAGE_LIMIT_DEFAULT,
			author,
			publishedFrom,
			publishedTo,
			title,
		} = filters;
		const skip = (page - 1) * limit;

		// Using QueryBuilder for dynamic filters because FindOptions cannot easily compose
		// complex WHERE clauses with optional joins, date ranges, and partial string matching.
		// QueryBuilder also avoids N+1 issues when we later add relations to the query.
		const qb: SelectQueryBuilder<Article> = this.articlesRepository
			.createQueryBuilder("article")
			.leftJoinAndSelect("article.author", "author")
			.skip(skip)
			.take(limit)
			.orderBy("article.publishedAt", "DESC");

		if (author) {
			qb.andWhere("article.authorId = :author", { author });
		}
		if (publishedFrom) {
			qb.andWhere("article.publishedAt >= :publishedFrom", {
				publishedFrom: new Date(publishedFrom),
			});
		}
		if (publishedTo) {
			qb.andWhere("article.publishedAt <= :publishedTo", {
				publishedTo: new Date(publishedTo),
			});
		}
		if (title) {
			qb.andWhere("article.title ILIKE :title", { title: `%${title}%` });
		}

		const [data, total] = await qb.getManyAndCount();
		const result: PaginatedResult<Article> = {
			data,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};

		this.logger.log(`Found ${total} articles.`);
		// Cache TTLs should be config-driven; hardcoding here for simplicity.
		// In production, move list TTL and detail TTL to ConfigService so ops can tune without deploys.
		await this.cacheManager.set(cacheKey, result, 60_000);
		return result;
	}

	async findOne(id: string): Promise<Article> {
		const cacheKey = `articles:${id}`;
		const cached = await this.cacheManager.get<Article>(cacheKey);
		if (cached) {
			this.logger.debug(`Found article in cache: ${cacheKey}`);
			return cached;
		}

		const article = await this.articlesRepository.findOne({
			where: { id },
			relations: ["author"],
		});
		if (!article) {
			throw new NotFoundException(`Article with id "${id}" not found`);
		}

		await this.cacheManager.set(cacheKey, article, 120_000);
		return article;
	}

	async update(id: string, authorId: string, dto: UpdateArticleDto): Promise<Article> {
		const article = await this.articlesRepository.findOne({ where: { id, authorId } });
		if (!article) {
			throw new NotFoundException(`Article with id "${id}" not found`);
		}

		if (dto.title !== undefined) article.title = dto.title;
		if (dto.description !== undefined) article.description = dto.description;
		if (dto.publishedAt !== undefined) {
			article.publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : null;
		}

		return await this.articlesRepository.save(article);
	}

	async remove(id: string, authorId: string): Promise<void> {
		const result = await this.articlesRepository.delete({ id, authorId });
		if (result.affected === 0) {
			throw new NotFoundException(`Article with id "${id}" not found`);
		}
	}
}
