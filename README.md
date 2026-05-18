# NestJS Articles API

REST API for article publishing — authentication, CRUD, Redis caching, and Swagger docs. Built with **NestJS 11**, **TypeORM**, **PostgreSQL 16**, and **Redis 7**.

## Tech Stack

| Layer         | Tech                                                       |
|---------------|------------------------------------------------------------|
| Runtime       | Node.js 20+, TypeScript 5                                  |
| Framework     | NestJS 11                                                  |
| ORM           | TypeORM 0.3 + `typeorm-naming-strategies` (snake_case)     |
| Database      | PostgreSQL 16 (`pg`)                                       |
| Cache         | Redis 7 (`@keyv/redis` + `cache-manager`)                  |
| Auth          | Passport JWT + `bcrypt` (salt rounds: 10)                  |
| Validation    | `class-validator` + `class-transformer`                    |
| Rate Limiting | `@nestjs/throttler` + Redis (`KeyvThrottlerStorage`)       |
| Docs          | Swagger / OpenAPI (`@nestjs/swagger`)                      |
| Testing       | Jest + Supertest                                           |

## Architecture

```
src/
├── api/                     # Feature modules (controllers, services, DTOs)
│   ├── auth/                #   Authentication (signup, signin, JWT)
│   ├── articles/            #   Article CRUD with pagination, filtering, caching
│   └── users/               #   User lookup (used internally by auth)
├── domain/                  # Domain layer (entities, interfaces)
│   └── entities/            #   User, Article entities
└── common/                  # Shared infrastructure
    ├── config/              #   Environment configuration (registerAs)
    ├── constants/           #   Auth & pagination constants
    ├── database/            #   BaseEntity, DataSource, migrations
    ├── decorators/          #   @CurrentUser() param decorator
    ├── filters/             #   GlobalExceptionFilter
    ├── interceptors/        #   CacheInvalidationInterceptor
    ├── pagination/          #   PaginationDto, PaginatedResult interface
    └── redis/               #   Shared redis module (Redis-backed rate limiting)
```

- **Layered pattern**: Controller → Service → Repository (TypeORM)
- **URI versioning**: `VersioningType.URI` with default version `1` → `/api/v1/...`
- **Path aliases**: `@common/*`, `@api/*` (declared in `tsconfig.json`)
- **Global validation**: `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, `transform`
- **SnakeNamingStrategy** maps `camelCase` properties to `snake_case` columns in PostgreSQL

### Module Dependency Graph

```
AppModule
├── ConfigModule (global)     — .env loading
├── TypeOrmModule (global)    — PostgreSQL async config
├── CacheModule (global)      — Redis via @keyv/redis
├── AuthModule
│   ├── UsersModule           — wraps User entity
│   ├── PassportModule        — default strategy: jwt
│   └── JwtModule             — async config from env
└── ArticlesModule
    ├── TypeOrmModule.forFeature([Article])
    └── AuthModule            — reuses JwtStrategy + JwtAuthGuard
```

## Prerequisites

- Node.js >= 20
- Docker & Docker Compose
- pnpm

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp env.example .env   # edit values if needed

# 3. Start PostgreSQL and Redis
docker compose up -d

# 4. Run database migrations
pnpm migration:run

# 5. Start the dev server
pnpm start:dev
```

The API is available at `http://localhost:3000/api/v1/`. Swagger docs at `http://localhost:3000/docs`.

## Environment Variables

| Variable                       | Default     | Description                   |
|--------------------------------|-------------|-------------------------------|
| `PORT`                         | 3000        | API port                      |
| `DB_HOST`                      | localhost   | PostgreSQL host               |
| `DB_PORT`                      | 5432        | PostgreSQL port               |
| `DB_USER`                      | postgres    | Database user                 |
| `DB_PASS`                      | secret      | Database password             |
| `DB_NAME`                      | articles_db | Database name                 |
| `JWT_SECRET`                   | supersecret | JWT signing secret            |
| `JWT_EXPIRES_IN`               | 1h          | Access token TTL              |
| `REDIS_HOST`                   | localhost   | Redis host                    |
| `REDIS_PORT`                   | 6379        | Redis port                    |
| `THROTTLE_TTL`                 | 60000       | Rate limit window (ms)        |
| `THROTTLE_LIMIT`               | 30          | Default global limit          |
| `THROTTLE_LIMIT_AUTH`          | 5           | Auth endpoints limit          |
| `THROTTLE_LIMIT_ARTICLE_WRITE` | 10          | Article write endpoints limit |

## Scripts

| Command                                                                 | Description                          |
|-------------------------------------------------------------------------|--------------------------------------|
| `pnpm build`                                                            | Compile to `dist/`                   |
| `pnpm format`                                                           | Format with Prettier                 |
| `pnpm start`                                                            | Start dev server                     |
| `pnpm start:dev`                                                        | Dev server with watch mode           |
| `pnpm start:debug`                                                      | Dev server with debug + watch        |
| `pnpm start:prod`                                                       | Start production build               |
| `pnpm lint`                                                             | Lint with ESLint (auto-fix)          |
| `pnpm test`                                                             | Run unit tests                       |
| `pnpm test:watch`                                                       | Unit tests in watch mode             |
| `pnpm test:cov`                                                         | Unit tests with coverage report      |
| `pnpm test:debug`                                                       | Unit tests with debugger             |
| `pnpm test:e2e`                                                         | E2E tests (requires running app)     |
| `pnpm migration:generate -- src/common/database/migrations/<Name>`      | Generate a new migration             |
| `pnpm migration:run`                                                    | Apply pending migrations             |
| `pnpm migration:revert`                                                 | Revert the last migration            |

## Data Model

```
User (users)
├── id: uuid (PK, default uuid_generate_v4())
├── email: varchar(255) [UNIQUE, INDEX]
├── firstName: varchar
├── lastName: varchar [nullable]
├── passwordHash: varchar
├── createdAt: timestamp (auto)
├── updatedAt: timestamp (auto)
└── articles: Article[] (1:N)

Article (articles)
├── id: uuid (PK, default uuid_generate_v4())
├── title: varchar(255)
├── description: text
├── publishedAt: timestamp [nullable]
├── authorId: uuid (FK → users.id)
├── createdAt: timestamp (auto)
├── updatedAt: timestamp (auto)
└── author: User (N:1, via authorId)
```

## API Reference

### Authentication

```bash
# Register a new user
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123", "firstName": "John", "lastName": "Wick"}'

# Login
curl -X POST http://localhost:3000/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

Both return:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "b386bec6-70c5-4710-b6f4-3629ccd2a7e5",
    "email": "user@example.com"
  }
}
```

### Articles

All article endpoints are under `/api/v1/articles`.

```bash
# List articles (public, paginated, filtered)
curl "http://localhost:3000/api/v1/articles?page=1&limit=10&author=<userId>&publishedFrom=2026-01-01T00:00:00.000Z&title=test"

# Get single article (public)
curl http://localhost:3000/api/v1/articles/<articleId>

# Create article (auth required)
curl -X POST http://localhost:3000/api/v1/articles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title": "My Article", "description": "Article content", "publishedAt": "2026-06-15T12:00:00.000Z"}'

# Update article (auth required — partial update)
curl -X PATCH http://localhost:3000/api/v1/articles/<articleId> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title": "Updated Title"}'

# Delete article (auth required)
curl -X DELETE http://localhost:3000/api/v1/articles/<articleId> \
  -H "Authorization: Bearer <token>"
```

### Pagination Response Format

```json
{
  "data": [],
  "total": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

### Filters (Query Parameters)

| Parameter       | Type     | Description                            |
|-----------------|----------|----------------------------------------|
| `page`          | number   | Page number (default: 1)               |
| `limit`         | number   | Items per page (default: 10, max: 100) |
| `author`        | uuid     | Filter by author ID                    |
| `publishedFrom` | ISO 8601 | Filter by publication start date       |
| `publishedTo`   | ISO 8601 | Filter by publication end date         |
| `title`         | string   | Case-insensitive partial match         |

## Caching Strategy

- **Pattern**: Cache-aside (lazy-loading) — check Redis first, miss → query DB → populate cache
- **Articles list**: key `articles:list:${JSON.stringify(filters)}`, TTL **60s**
- **Article detail**: key `articles:${id}`, TTL **120s**
- **Invalidation**: `CacheInvalidationInterceptor` fires on POST/PATCH/DELETE — deletes the single-article cache and `SCAN`s for `articles:list:*` keys to bulk-delete them
- **Trade-off**: `SCAN` is O(n) on keyspace — acceptable at this scale; for high throughput, prefer event-driven invalidation

The rate limiter (`KeyvThrottlerStorage`) reuses the same Redis connection via cache-manager, avoiding a separate Redis client.

## Testing

```bash
# Unit tests
pnpm test

# With coverage
pnpm test:cov

# E2E tests (requires PostgreSQL and Redis running)
pnpm test:e2e
```

### Unit tests

Auth service (signup, signin, edge cases), articles service (CRUD, caching, pagination, filters), and users service. All dependencies are mocked — no database or Redis connection required.

### E2E tests

Comprehensive end-to-end tests using Supertest against a real NestJS application instance with PostgreSQL and Redis:

| Test file                   | Coverage                                                                                                                                                           |
|-----------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `test/auth.e2e-spec.ts`     | Signup (success, duplicate, validation errors), signin (valid, invalid credentials, non-revealing errors)                                                          |
| `test/articles.e2e-spec.ts` | Full CRUD, pagination, filtering (author, title, date), auth guards (401 on unauthenticated), ownership guard (404 on cross-user update/delete), validation errors |
| `test/app.e2e-spec.ts`      | 404 for unknown routes, basic API reachability                                                                                                                     |

The e2e suite uses a shared app instance (`beforeAll`/`afterAll`) with database truncation between test suites and Redis cache clearing to prevent stale cache interference.

## Production Considerations

- **Ownership guard** — Implemented. Article update and delete operations check `article.authorId === currentUser.id` in the service layer, returning 404 on mismatch (non-revealing). For production, consider extracting this into a dedicated guard for cleaner separation of concerns.
- **Global exception filter** — Implemented (`GlobalExceptionFilter`). All errors are normalized into `{ statusCode, message }` shape. 5xx errors are logged. The filter is registered globally in `main.ts`.
- **Rate limiting** — Implemented via `@nestjs/throttler` with a custom `KeyvThrottlerStorage` that reuses the Redis connection from cache-manager (no separate Redis client). `ThrottlerGuard` is registered globally with per-route overrides. Swagger docs (`/docs`) are excluded as they are served outside the NestJS controller pipeline. Limits: auth endpoints 5 req/min, article writes 10 req/min, default 30 req/min. For production, consider adding CAPTCHA on auth endpoints and using a sliding-window algorithm instead of fixed-window.
- **No refresh token rotation** — Only a short-lived access token (default 1h) is issued. Adding refresh tokens with rotation improves both UX and security for long-lived sessions.
- **Cache invalidation** — Uses Redis `SCAN` + bulk `DEL` on mutating requests. This is simple but does not scale to millions of keys. For production traffic, prefer event-driven invalidation via Redis pub/sub or a message queue.
- **Password max length 72** — Bcrypt truncates input at 72 bytes. `@MaxLength(72)` in the DTO prevents silent truncation of longer passwords.
- **E2E test coverage** — 30 tests covering auth flows, article CRUD, pagination, filtering, auth guards, ownership checks, and validation errors. Add coverage for concurrent edits, large payloads, and edge cases (e.g., UUID injection).
