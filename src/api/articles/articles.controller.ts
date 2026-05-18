import { ArticleResponseDto } from "@api/articles/dto/article-response.dto";
import { JwtAuthGuard } from "@api/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@common/decorators";
import { CacheInvalidationInterceptor } from "@common/interceptors";
import { Serialize } from "@common/interceptors/serialize.interceptor";
import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Query,
	UseGuards,
	UseInterceptors,
} from "@nestjs/common";
import {
	ApiBadRequestResponse,
	ApiBearerAuth,
	ApiCreatedResponse,
	ApiNoContentResponse,
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiOperation,
	ApiQuery,
	ApiTags,
	ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ArticlesService } from "./articles.service";
import { ArticleFilterDto, CreateArticleDto, UpdateArticleDto } from "./dto";

@ApiTags("Articles")
@Controller({
	path: "articles",
	version: "1",
})
export class ArticlesController {
	constructor(private readonly articlesService: ArticlesService) {}

	@Get()
	@Serialize(ArticleResponseDto)
	@ApiOperation({
		summary: "List articles",
		description:
			"Returns a paginated list of articles with optional filtering by author, title, and publication date range. " +
			"Public endpoint — no authentication required.",
	})
	@ApiOkResponse({ description: "Paginated list of articles" })
	@ApiQuery({ type: ArticleFilterDto })
	async findAll(@Query() filters: ArticleFilterDto) {
		return this.articlesService.findAll(filters);
	}

	@Get(":id")
	@Serialize(ArticleResponseDto)
	@ApiOperation({
		summary: "Get article by ID",
		description: "Returns a single article with its author information. Public endpoint.",
	})
	@ApiOkResponse({ description: "The article with the given ID" })
	@ApiNotFoundResponse({ description: "Article not found" })
	async findOne(@Param("id") id: string) {
		return this.articlesService.findOne(id);
	}

	@Throttle({
		default: {
			limit: 10,
			ttl: 60_000,
		},
	})
	@UseInterceptors(CacheInvalidationInterceptor)
	@Serialize(ArticleResponseDto)
	@Post()
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({
		summary: "Create article",
		description:
			"Creates a new article for the authenticated user. " +
			"Optionally accepts a publishedAt date for scheduling. " +
			"Rate-limited to 10 requests per 60 seconds. " +
			"Invalidates article list caches.",
	})
	@ApiCreatedResponse({ description: "Article successfully created" })
	@ApiBadRequestResponse({ description: "Validation error" })
	@ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
	async create(@Body() dto: CreateArticleDto, @CurrentUser() user: { id: string }) {
		return this.articlesService.create(dto, user.id);
	}

	@Throttle({
		default: {
			limit: 10,
			ttl: 60_000,
		},
	})
	@UseInterceptors(CacheInvalidationInterceptor)
	@Serialize(ArticleResponseDto)
	@Patch(":id")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({
		summary: "Update article",
		description:
			"Partially updates an article. " +
			"Only the author can update their own article (others receive 404). " +
			"Rate-limited to 10 requests per 60 seconds. " +
			"Invalidates article caches.",
	})
	@ApiOkResponse({ description: "Article successfully updated" })
	@ApiBadRequestResponse({ description: "Validation error" })
	@ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
	@ApiNotFoundResponse({ description: "Article not found or not owned by the user" })
	async update(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() dto: UpdateArticleDto,
		@CurrentUser() user: { id: string },
	) {
		return this.articlesService.update(id, user.id, dto);
	}

	@Throttle({
		default: {
			limit: 10,
			ttl: 60_000,
		},
	})
	@UseInterceptors(CacheInvalidationInterceptor)
	@Delete(":id")
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiBearerAuth()
	@ApiOperation({
		summary: "Delete article",
		description:
			"Deletes an article. " +
			"Only the author can delete their own article (others receive 404). " +
			"Rate-limited to 10 requests per 60 seconds. " +
			"Invalidates article caches.",
	})
	@ApiNoContentResponse({ description: "Article successfully deleted" })
	@ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
	@ApiNotFoundResponse({ description: "Article not found or not owned by the user" })
	async remove(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: { id: string }) {
		return this.articlesService.remove(id, user.id);
	}
}
