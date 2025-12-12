import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, ValidateNested } from 'class-validator';
import { SignUpDto } from 'src/auth/dtos/sign-up.dto';
import { AuthMethod } from 'src/auth/schemas/auth-methods.schema';

export class CreateUserDto extends SignUpDto {
  @ApiProperty({
    description: 'The auth methods of the user',
    required: true,
    example: { provider: 'email', passwordHash: 'hashedPassword' },
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => AuthMethod)
  authMethod: AuthMethod;
}
