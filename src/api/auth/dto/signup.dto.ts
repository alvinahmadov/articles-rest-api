import { AuthConstants } from "@common/constants";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class SignUpDto {
	@ApiProperty({
		description: "Email address for the new user account",
		example: "user@example.com",
	})
	@IsEmail()
	email: string;

	@ApiProperty({
		description:
			"Password for the new user account. Bcrypt silently truncates input beyond 72 bytes, so the max length is enforced at DTO level.",
		minLength: AuthConstants.PASSWORD_MIN,
		maxLength: AuthConstants.PASSWORD_MAX,
		example: "securePassword123",
	})
	@IsString()
	@MinLength(AuthConstants.PASSWORD_MIN)
	@MaxLength(AuthConstants.PASSWORD_MAX)
	password: string;

	@ApiPropertyOptional({
		description: "User's first name",
		example: "John",
	})
	@IsString()
	firstName?: string;

	@ApiPropertyOptional({
		description: "User's last name",
		example: "Wick",
	})
	@IsString()
	lastName?: string;
}
