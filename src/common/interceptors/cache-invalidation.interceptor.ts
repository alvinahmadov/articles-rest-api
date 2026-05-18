import type { Cache } from "cache-manager";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

import { CACHE_MANAGER } from "@nestjs/cache-manager";
import {
	CallHandler,
	ExecutionContext,
	Inject,
	Injectable,
	Logger,
	NestInterceptor,
} from "@nestjs/common";

/**
 * Interceptor to sweep list caches on any POST/PATCH/DELETE to /articles.
 *
 * An interceptor decouples cache invalidation from service logic, but it relies on
 * route pattern matching.
 */
@Injectable()
export class CacheInvalidationInterceptor implements NestInterceptor {
	private readonly logger = new Logger(CacheInvalidationInterceptor.name);

	constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest();
		const articleId = request.params.id;

		return next.handle().pipe(
			tap(async () => {
				// We put the disability in the "background" process (not through await),
				// to avoid increasing the response time for the customer.
				this.invalidateCache(articleId).catch((err) =>
					this.logger.error("Фоновая инвалидация кэша завершилась ошибкой", err),
				);
			}),
		);
	}

	private async invalidateCache(articleId?: string): Promise<void> {
		try {
			if (articleId) {
				await this.cacheManager.del(`articles:${articleId}`);
			}

			const store = (this.cacheManager as any).store;
			const client = store?.client;

			if (!client) {
				await this.cacheManager.del("articles:list:*");
				return;
			}

			let cursor = "0";
			const matchPattern = "articles:list:*";

			do {
				const reply = await client.call("SCAN", cursor, "MATCH", matchPattern, "COUNT", "100");
				cursor = reply[0];
				const keys = reply[1];

				if (keys && keys.length > 0) {
					await client.call("DEL", ...keys);
				}
			} while (cursor !== "0");
		} catch (error) {
			this.logger.warn("Invalidation of list cache failed", error);
		}
	}
}
