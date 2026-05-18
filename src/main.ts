import { GlobalExceptionFilter } from "@common/filters";

import { Logger, ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	const configService = app.get(ConfigService);
	const logger = new Logger("Bootstrap");

	app.setGlobalPrefix("api", { exclude: ["health"] });
	// Best practice: Enable URI-based versioning
	app.enableVersioning({
		type: VersioningType.URI,
		defaultVersion: "1",
	});

	// Global validation pipe with strict mode.
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true, // strip unknown properties silently
			forbidNonWhitelisted: true, // surfaces them as 400 errors.
			transform: true,
		}),
	);

	// Setup Swagger
	const config = new DocumentBuilder()
		.setTitle("Articles REST API")
		.setDescription(
			"REST API for article publishing with authentication, CRUD operations, Redis caching, and rate limiting. " +
				"Built with NestJS 11, TypeORM, PostgreSQL 16, and Redis 7.",
		)
		.setVersion("1.0.0")
		.addBearerAuth(
			{
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
				description: "Paste the JWT access token obtained from /auth/signin or /auth/signup",
			},
			"access-token",
		)
		.build();

	const document = SwaggerModule.createDocument(app, config);

	// Swagger will be available at http://localhost:3000/docs
	SwaggerModule.setup("docs", app, document);

	// Global exception filter normalizes all error responses into { statusCode, message, ... }
	// shape, replacing NestJS's built-in default responses.
	app.useGlobalFilters(new GlobalExceptionFilter());

	const port = configService.get<number>("app.port")!;
	await app.listen(port);
	logger.log(`Application listening on port ${port}`);
}

bootstrap().catch((e) => console.log(e));
