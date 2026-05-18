import { AuthConstants } from "@common/constants";
import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class SignInDto {
	@ApiProperty({
		description: "Registered email address",
		example: "user@example.com",
	})
	@IsEmail()
	email: string;

	@ApiProperty({
		description: "Account password",
		example: "securePassword123",
	})
	@IsString()
	@MinLength(AuthConstants.PASSWORD_MIN)
	@MaxLength(AuthConstants.PASSWORD_MAX)
	password: string;
}
