import { ApiProperty, ApiPropertyOptional }          from "@nestjs/swagger";
import { PaginationDto }                           from "@common/pagination/pagination.dto";
import { IsISO8601, IsOptional, IsString, IsUUID } from "class-validator";

export class ArticleFilterDto extends PaginationDto {
	@ApiProperty({
		title: "Author ID",
		description: "The unique identifier of the Author of the article.",
		example: "0bf5531e-5bd1-436d-9775-5f5dff351a71",
	})
	@IsOptional()
	@IsUUID()
	author?: string;

	@ApiPropertyOptional({
		description: "Filter articles published after this date (ISO 8601)",
		format: "date-time",
		example: "2026-01-01T00:00:00.000Z",
	})
	@IsOptional()
	@IsISO8601()
	publishedFrom?: string;

	@ApiPropertyOptional({
		description: "Filter articles published before this date (ISO 8601)",
		format: "date-time",
		example: "2026-12-31T23:59:59.000Z",
	})
	@IsOptional()
	@IsISO8601()
	publishedTo?: string;

	@ApiPropertyOptional({
		description: "Case-insensitive partial title search",
		example: "nestjs",
	})
	@IsOptional()
	@IsString()
	title?: string;
}
