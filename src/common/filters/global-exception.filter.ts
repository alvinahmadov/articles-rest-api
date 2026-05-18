import type { Response } from "express";

import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
	Logger,
} from "@nestjs/common";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(GlobalExceptionFilter.name);

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();

		const status =
			exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

		const message =
			exception instanceof HttpException ? exception.getResponse() : "Internal server error";

		const errorResponse =
			typeof message === "string"
				? { statusCode: status, message }
				: { statusCode: status, ...message };

		if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
			this.logger.error(
				"Unhandled exception",
				exception instanceof Error ? exception.stack : exception,
			);
		}

		response.status(status).json(errorResponse);
	}
}
