import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
	port: parseInt(process.env.PORT ?? "3000", 10),
	database: {
		host: process.env.DB_HOST ?? "localhost",
		port: parseInt(process.env.DB_PORT ?? "5432", 10),
		user: process.env.DB_USER ?? "postgres",
		password: process.env.DB_PASS ?? "secret",
		name: process.env.DB_NAME ?? "articles_db",
	},
	jwt: {
		secret: process.env.JWT_SECRET ?? "supersecret",
		expiresIn: process.env.JWT_EXPIRES_IN ?? "1h",
	},
	redis: {
		host: process.env.REDIS_HOST ?? "localhost",
		port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
	},
	throttle: {
		ttl: parseInt(process.env.THROTTLE_TTL ?? "60000", 10),
		globalLimit: parseInt(process.env.THROTTLE_LIMIT ?? "30", 10),
		authLimit: parseInt(process.env.THROTTLE_LIMIT_AUTH ?? "5", 10),
		articleWriteLimit: parseInt(process.env.THROTTLE_LIMIT_ARTICLE_WRITE ?? "10", 10),
	},
}));
