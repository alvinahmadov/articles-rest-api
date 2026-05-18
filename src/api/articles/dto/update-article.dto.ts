import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO8601, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateArticleDto {
	@ApiPropertyOptional({
		description: "Updated article title",
		maxLength: 255,
		example: "Updated: How to Build a REST API with NestJS",
	})
	@IsOptional()
	@IsString()
	@MaxLength(255)
	title?: string;

	@ApiPropertyOptional({
		description: "Updated article body",
		example: "This is the revised version of the article with additional content...",
	})
	@IsOptional()
	@IsString()
	description?: string;

	@ApiPropertyOptional({
		description: "Updated publication date (ISO 8601). Set to null to unpublish.",
		format: "date-time",
		example: "2026-07-01T00:00:00.000Z",
	})
	@IsOptional()
	@IsISO8601()
	publishedAt?: string;
}
