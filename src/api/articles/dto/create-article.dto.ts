import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO8601, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateArticleDto {
	@ApiProperty({
		description: "Article title",
		maxLength: 255,
		example: "How to Build a REST API with NestJS",
	})
	@IsString()
	@MaxLength(255)
	title!: string;

	@ApiProperty({
		description: "Article body content",
		example: "In this article, we will explore how to build a production-ready REST API...",
	})
	@IsString()
	description!: string;

	@ApiPropertyOptional({
		description:
			"Scheduled publication date (ISO 8601). " +
			"If omitted, the article is published immediately.",
		format: "date-time",
		example: "2026-06-15T12:00:00.000Z",
	})
	@IsOptional()
	@IsISO8601()
	publishedAt?: string;
}
