import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
	UseInterceptors,
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { map, Observable } from "rxjs";

interface ClassConstructor {
	new (...args: any[]): object;
}

export function Serialize(dto: ClassConstructor) {
	return UseInterceptors(new SerializeInterceptor(dto));
}

@Injectable()
export class SerializeInterceptor implements NestInterceptor {
	constructor(private dto: ClassConstructor) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		return next.handle().pipe(
			map((data: any) => {
				if (data && data.data && Array.isArray(data.data)) {
					return {
						...data,
						data: plainToInstance(this.dto, data.data, {
							excludeExtraneousValues: true,
						}),
					};
				}
				return plainToInstance(this.dto, data, {
					excludeExtraneousValues: true,
				});
			}),
		);
	}
}