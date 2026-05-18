import { AuthModule } from "@api/auth/auth.module";

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Article } from "../../domain/entities/article.entity";
import { ArticlesController } from "./articles.controller";
import { ArticlesService } from "./articles.service";

@Module({
	imports: [
		TypeOrmModule.forFeature([Article]),
		AuthModule,
		// Articles module uses the global CacheModule; no need to re-register here.
	],
	controllers: [ArticlesController],
	providers: [ArticlesService],
})
export class ArticlesModule {}
