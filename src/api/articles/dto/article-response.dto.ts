import { Expose, Type } from "class-transformer";

export class AuthorResponseDto {
	@Expose() id!: string;
	@Expose() email!: string;
	@Expose() firstName?: string;
	@Expose() lastName?: string;
}

export class ArticleResponseDto {
	@Expose() id!: string;
	@Expose() title!: string;
	@Expose() description!: string;
	

	@Expose() publishedAt!: Date | null;
	@Expose() createdAt!: Date;

	@Expose() authorId!: string;
	@Expose()
	@Type(() => AuthorResponseDto)
	author!: AuthorResponseDto;
}
