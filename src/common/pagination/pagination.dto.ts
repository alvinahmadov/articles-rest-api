import { PaginationConstants } from "@common/constants";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class PaginationDto {
	@ApiPropertyOptional({
		description: "Page number (1-based)",
		minimum: PaginationConstants.PAGE_MIN,
		default: PaginationConstants.PAGE_MIN,
		example: 1,
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(PaginationConstants.PAGE_MIN)
	page?: number = PaginationConstants.PAGE_MIN;

	@ApiPropertyOptional({
		description: "Number of items per page",
		minimum: PaginationConstants.PAGE_LIMIT_MIN,
		maximum: PaginationConstants.PAGE_LIMIT_MAX,
		default: PaginationConstants.PAGE_LIMIT_DEFAULT,
		example: 10,
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(PaginationConstants.PAGE_LIMIT_MIN)
	@Max(PaginationConstants.PAGE_LIMIT_MAX)
	limit?: number = PaginationConstants.PAGE_LIMIT_DEFAULT;
}
